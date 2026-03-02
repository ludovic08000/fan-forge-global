import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("Config error", { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const type = session.metadata?.type;

    if (type === 'wishlist_contribution') {
      const wishlistId = session.metadata?.wishlist_id;
      const contributorId = session.metadata?.contributor_id;
      const amount = parseFloat(session.metadata?.amount || '0');

      if (wishlistId && contributorId) {
        // Record contribution
        await supabase.from('wishlist_contributions').insert({
          wishlist_id: wishlistId,
          contributor_id: contributorId,
          amount,
          currency: session.currency?.toUpperCase() || 'EUR',
          stripe_payment_intent_id: session.payment_intent as string,
          status: 'paid',
        });

        // Update current_amount
        await supabase.rpc('increment_wishlist_amount', { p_wishlist_id: wishlistId, p_amount: amount });
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
