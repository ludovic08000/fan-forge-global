/**
 * Webhook Stripe pour confirmer le paiement d'une enchère
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[AUCTION-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_AUCTION_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Server config error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    logStep("Webhook signature verification failed", { error: err.message });
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const auctionId = session.metadata?.auction_id;
    const winnerId = session.metadata?.winner_id;

    if (auctionId) {
      logStep("Auction paid", { auctionId, winnerId });

      await supabase
        .from('content_auctions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', auctionId);

      // Notifier le créateur
      const { data: auction } = await supabase
        .from('content_auctions')
        .select('title, creator_id, current_price, creators!inner(user_id)')
        .eq('id', auctionId)
        .single();

      if (auction) {
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', winnerId)
          .single();

        const winnerName = winnerProfile?.display_name || winnerProfile?.username || 'Un fan';

        await supabase.from('notifications').insert({
          user_id: (auction as any).creators.user_id,
          type: 'payment_success',
          title: 'Enchère payée ! 💰',
          message: `${winnerName} a payé ${auction.current_price}€ pour "${auction.title}"`,
          data: { auction_id: auctionId, amount: auction.current_price },
        });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
