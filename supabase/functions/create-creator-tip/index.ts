import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { logPaymentEvent } from "../_shared/auditLog.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREATOR-TIP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);
  const startTime = Date.now();

  try {
    logStep("Function started");

    // Rate limiting check (pre-auth check with IP only)
    const preRateLimitResult = await checkRateLimit(req, null, 'tip');
    if (!preRateLimitResult.allowed) {
      logStep("Rate limit exceeded (pre-auth)");
      return rateLimitResponse(preRateLimitResult, corsHeaders);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Utiliser service role pour accéder aux créateurs
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Client pour l'authentification utilisateur
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Récupérer l'auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    // PARALLÉLISER: Auth + Parse body en même temps
    const [authResult, body] = await Promise.all([
      supabaseAuth.auth.getUser(token),
      req.json()
    ]);

    if (authResult.error || !authResult.data.user) {
      throw new Error("User not authenticated");
    }

    const user = authResult.data.user;
    const { creatorId, amount, message } = body;

    logStep("Auth + body parsed", { userId: user.id, elapsed: Date.now() - startTime });

    if (!creatorId || !amount) {
      throw new Error("Missing required fields: creatorId, amount");
    }

    if (amount < 1) {
      throw new Error("Minimum tip amount is 1€");
    }

    // PARALLÉLISER: Récupérer créateur + Vérifier client Stripe en même temps
    const [creatorResult, customersResult] = await Promise.all([
      supabaseClient
        .from('creators')
        .select('stripe_account_id, stage_name, user_id')
        .eq('id', creatorId)
        .single(),
      stripe.customers.list({ email: user.email!, limit: 1 })
    ]);

    if (creatorResult.error || !creatorResult.data) {
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
              description: message ? `Message: "${message}"` : "Pourboire",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}?tip=success`,
      cancel_url: `${origin}?tip=cancelled`,
      metadata: {
        type: "creator_tip",
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
        application_fee_amount: Math.round(amountInCents * 15 / 100),
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, elapsed: Date.now() - startTime });

    // NOTE: On ne crée PAS le tip ici !
    // Le tip sera créé par le webhook stripe-subscription-webhook 
    // après confirmation du paiement (checkout.session.completed)
    // Cela évite les tips en double ou non payés

    logStep("Response sent (tip will be created by webhook after payment)", { totalTime: Date.now() - startTime });

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
