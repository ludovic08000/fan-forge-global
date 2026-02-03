/**
 * Edge function pour acheter un replay de live privé
 * Crée une session Stripe Checkout et gère le paiement
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const PLATFORM_COMMISSION_RATE = 0.15;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BUY-PRIVATE-REPLAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    logStep("Processing purchase request");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    const body = await req.json();
    const { replayId, returnUrl } = body;

    if (!replayId) {
      return new Response(
        JSON.stringify({ error: "replayId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Processing for user", { userId, replayId });

    // Récupérer le replay
    const { data: replay, error: replayError } = await supabaseAdmin
      .from("private_live_replays")
      .select(`
        *,
        creators!inner(
          id,
          user_id,
          stage_name,
          stripe_account_id,
          stripe_charges_enabled
        )
      `)
      .eq("id", replayId)
      .single();

    if (replayError || !replay) {
      logStep("Replay not found", { replayId, error: replayError?.message });
      return new Response(
        JSON.stringify({ error: "Replay not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!replay.is_available) {
      return new Response(
        JSON.stringify({ error: "This replay is no longer available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creator = replay.creators as any;

    // Vérifier si l'utilisateur a déjà acheté ce replay
    const { data: existingPurchase } = await supabaseAdmin
      .from("private_live_replay_purchases")
      .select("id, status")
      .eq("replay_id", replayId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingPurchase?.status === "completed") {
      logStep("Already purchased", { purchaseId: existingPurchase.id });
      return new Response(
        JSON.stringify({ 
          alreadyPurchased: true,
          message: "You have already purchased this replay" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier si le créateur a Stripe Connect activé
    if (!creator.stripe_account_id || !creator.stripe_charges_enabled) {
      logStep("Creator Stripe not configured", { creatorId: creator.id });
      return new Response(
        JSON.stringify({ error: "Creator payment not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = Math.round(replay.replay_price * 100); // Convertir en centimes
    const platformFee = Math.round(amount * PLATFORM_COMMISSION_RATE);

    logStep("Creating Stripe session", { 
      amount: replay.replay_price, 
      platformFee: platformFee / 100,
      creatorStripeId: creator.stripe_account_id 
    });

    // Créer la session Stripe Checkout avec transfert vers le créateur
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: replay.currency.toLowerCase(),
            product_data: {
              name: replay.title,
              description: `Replay de live privé de ${creator.stage_name || 'créateur'}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creator.stripe_account_id,
        },
      },
      success_url: `${returnUrl || 'https://fan-forge-global.lovable.app'}?replay_purchase_success=true&replay_id=${replayId}`,
      cancel_url: `${returnUrl || 'https://fan-forge-global.lovable.app'}?replay_purchase_cancelled=true`,
      metadata: {
        type: "private_live_replay",
        replay_id: replayId,
        user_id: userId,
        creator_id: creator.id,
        amount: replay.replay_price.toString(),
      },
    });

    // Créer un enregistrement d'achat en attente
    await supabaseAdmin
      .from("private_live_replay_purchases")
      .upsert({
        replay_id: replayId,
        user_id: userId,
        amount: replay.replay_price,
        currency: replay.currency,
        stripe_checkout_session_id: session.id,
        status: "pending",
      }, {
        onConflict: 'replay_id,user_id'
      });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("Error", { message: error.message, stack: error.stack });
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
