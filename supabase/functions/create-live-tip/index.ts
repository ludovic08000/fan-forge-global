import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LIVE-TIP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authentifier l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Récupérer les données de la requête
    const { liveStreamId, creatorId, amount, message } = await req.json();

    if (!liveStreamId || !creatorId || !amount) {
      throw new Error("Missing required fields: liveStreamId, creatorId, amount");
    }

    if (amount < 1) {
      throw new Error("Minimum tip amount is 1€");
    }

    logStep("Tip request", { liveStreamId, creatorId, amount, message });

    // Récupérer les infos du créateur pour Stripe Connect
    const { data: creator, error: creatorError } = await supabaseClient
      .from('creators')
      .select('stripe_account_id, stage_name, user_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      throw new Error("Creator not found");
    }

    logStep("Creator found", { creatorId, stageName: creator.stage_name });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Vérifier si l'utilisateur est déjà client Stripe
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Créer une session de paiement
    const amountInCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Paramètres de la session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Tip pour ${creator.stage_name || 'Créateur'}`,
              description: message ? `Message: "${message}"` : "Pourboire live stream",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/live/${liveStreamId}?tip=success`,
      cancel_url: `${origin}/live/${liveStreamId}?tip=cancelled`,
      metadata: {
        type: "live_tip",
        live_stream_id: liveStreamId,
        creator_id: creatorId,
        sender_id: user.id,
        message: message || "",
      },
    };

    // Si le créateur a Stripe Connect, ajouter le transfer
    if (creator.stripe_account_id) {
      sessionParams.payment_intent_data = {
        transfer_data: {
          destination: creator.stripe_account_id,
        },
        // 10% commission plateforme
        application_fee_amount: Math.round(amountInCents * 0.1),
      };
      logStep("Stripe Connect transfer configured", { 
        destination: creator.stripe_account_id,
        fee: Math.round(amountInCents * 0.1)
      });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    // Enregistrer le tip en pending
    const { error: tipError } = await supabaseClient
      .from('tips')
      .insert({
        creator_id: creatorId,
        sender_id: user.id,
        amount: amount,
        currency: 'EUR',
        message: message || null,
        stripe_payment_intent_id: session.payment_intent as string,
      });

    if (tipError) {
      logStep("Error saving tip", { error: tipError });
    } else {
      logStep("Tip saved to database");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
