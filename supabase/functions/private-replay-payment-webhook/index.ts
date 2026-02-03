/**
 * Webhook Stripe pour confirmer les achats de replays de lives privés
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PRIVATE-REPLAY-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Vérifier la signature
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!signature) {
      logStep("ERROR: Missing stripe-signature");
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    logStep("Event type", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Vérifier que c'est un achat de replay
      if (session.metadata?.type !== "private_live_replay") {
        logStep("Not a replay purchase, ignored");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const replayId = session.metadata.replay_id;
      const userId = session.metadata.user_id;
      const creatorId = session.metadata.creator_id;
      const amount = parseFloat(session.metadata.amount);

      logStep("Replay purchase confirmed", { replayId, userId, amount });

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Mettre à jour l'achat
      await supabaseAdmin
        .from("private_live_replay_purchases")
        .update({
          status: "completed",
          stripe_payment_intent_id: session.payment_intent as string,
          completed_at: new Date().toISOString(),
        })
        .eq("replay_id", replayId)
        .eq("user_id", userId);

      // Incrémenter le compteur d'achats
      await supabaseAdmin.rpc('increment_replay_purchase_count', { p_replay_id: replayId });

      // Fallback si la fonction RPC n'existe pas
      await supabaseAdmin
        .from("private_live_replays")
        .update({
          purchase_count: supabaseAdmin.sql`purchase_count + 1`
        })
        .eq("id", replayId);

      // Récupérer les infos pour les notifications
      const { data: replay } = await supabaseAdmin
        .from("private_live_replays")
        .select("title, creators!inner(user_id, stage_name)")
        .eq("id", replayId)
        .single();

      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", userId)
        .single();

      const buyerName = userProfile?.display_name || userProfile?.username || 'Un utilisateur';
      const creator = replay?.creators as any;

      // Notification pour l'acheteur
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          type: "payment_success",
          title: "Achat confirmé ! 🎬",
          message: `Vous avez accès au replay "${replay?.title}"`,
          data: {
            replay_id: replayId,
            amount,
          },
        });

      // Notification pour le créateur
      if (creator?.user_id) {
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: creator.user_id,
            type: "sale",
            title: "Replay vendu ! 💰",
            message: `${buyerName} a acheté votre replay pour ${amount}€`,
            data: {
              replay_id: replayId,
              buyer_id: userId,
              amount,
            },
          });
      }

      logStep("Purchase completed successfully", { replayId, userId, amount });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    logStep("Error", { message: error.message });
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
