import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LIVE-TIP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);
  const startTime = Date.now();

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Client anon pour l'authentification utilisateur
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Client service role pour accéder aux données des créateurs (stripe_account_id)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Récupérer l'auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    // PARALLÉLISER: Auth + Parse body en même temps
    const [authResult, body] = await Promise.all([
      supabaseAnon.auth.getUser(token),
      req.json()
    ]);

    if (authResult.error || !authResult.data.user) {
      throw new Error("User not authenticated");
    }

    const user = authResult.data.user;
    const { liveStreamId, creatorId, amount, message } = body;

    logStep("Auth + body parsed", { userId: user.id, elapsed: Date.now() - startTime });

    if (!liveStreamId || !creatorId || !amount) {
      throw new Error("Missing required fields: liveStreamId, creatorId, amount");
    }

    if (amount < 1) {
      throw new Error("Minimum tip amount is 1€");
    }

    // PARALLÉLISER: Récupérer créateur (via admin pour accès stripe_account_id) + Vérifier client Stripe
    const [creatorResult, customersResult] = await Promise.all([
      supabaseAdmin
        .from('creators')
        .select('stripe_account_id, stage_name, user_id')
        .eq('id', creatorId)
        .single(),
      stripe.customers.list({ email: user.email!, limit: 1 })
    ]);

    if (creatorResult.error || !creatorResult.data) {
      logStep("Creator query failed", { error: creatorResult.error, creatorId });
      throw new Error("Creator not found");
    }

    const creator = creatorResult.data;
    const customerId = customersResult.data.length > 0 ? customersResult.data[0].id : undefined;

    logStep("Creator + customer fetched", { elapsed: Date.now() - startTime });

    // Créer la session de paiement
    const amountInCents = Math.round(amount * 100);
    const origin = req.headers.get("origin") || "https://lovable.dev";

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
        application_fee_amount: Math.round(amountInCents * 0.15),
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, elapsed: Date.now() - startTime });

    // BACKGROUND TASK: Enregistrer le tip en pending (ne bloque pas la réponse)
    const saveTipTask = async () => {
      try {
        const { error: tipError } = await supabaseAdmin
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
          logStep("Background: Error saving tip", { error: tipError });
        } else {
          logStep("Background: Tip saved to database");
        }
      } catch (err) {
        logStep("Background: Exception saving tip", { error: String(err) });
      }
    };

    // Lancer en background sans attendre
    EdgeRuntime.waitUntil(saveTipTask());

    logStep("Response sent", { totalTime: Date.now() - startTime });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, elapsed: Date.now() - startTime });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
