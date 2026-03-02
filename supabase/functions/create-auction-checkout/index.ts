/**
 * Edge Function: Crée un checkout Stripe pour le gagnant d'une enchère
 * ET finalise les enchères expirées
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[AUCTION-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  const corsHeaders = getCorsHeaders(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Auth error");
    const user = userData.user;

    const { action, auctionId } = await req.json();

    // Action: finaliser les enchères expirées (peut être appelé par cron)
    if (action === 'finalize') {
      logStep("Finalizing expired auctions");
      const { data, error } = await supabase.rpc('finalize_expired_auctions');
      if (error) throw error;
      return new Response(JSON.stringify({ finalized: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: créer un checkout pour le gagnant
    if (!auctionId) throw new Error("auctionId required");
    logStep("Creating checkout", { auctionId, userId: user.id });

    // Récupérer l'enchère
    const { data: auction, error: auctionError } = await supabase
      .from('content_auctions')
      .select('*, creators!inner(stripe_account_id, stripe_charges_enabled, user_id, platform_commission_rate)')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) throw new Error("Enchère introuvable");
    if (auction.winner_id !== user.id) throw new Error("Vous n'êtes pas le gagnant");
    if (auction.status !== 'ended') throw new Error("L'enchère n'est pas encore terminée");
    if (auction.paid_at) throw new Error("Déjà payé");

    const creator = auction.creators;
    if (!creator.stripe_account_id || !creator.stripe_charges_enabled) {
      throw new Error("Le créateur n'a pas configuré Stripe");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });

    const commissionRate = creator.platform_commission_rate || 0.15;
    const amountCents = Math.round(auction.current_price * 100);
    const platformFee = Math.round(amountCents * commissionRate);
    const origin = req.headers.get("origin") || "https://fan-forge-global.lovable.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: auction.currency.toLowerCase(),
          product_data: {
            name: `Enchère gagnée: ${auction.title}`,
            description: `Contenu exclusif remporté aux enchères`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: creator.stripe_account_id },
      },
      customer_email: user.email,
      success_url: `${origin}/dashboard?auction_paid=${auctionId}`,
      cancel_url: `${origin}/dashboard?auction_cancel=${auctionId}`,
      metadata: {
        auction_id: auctionId,
        winner_id: user.id,
        creator_id: auction.creator_id,
      },
    });

    logStep("Checkout created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("Error", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
