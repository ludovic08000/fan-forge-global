import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-LIVE-MEDIA-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    logStep("Webhook received");

    // Vérifier les secrets requis
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Vérification OBLIGATOIRE de la signature Stripe
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Gérer les événements de paiement
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;
      
      if (metadata?.content_type !== 'live_media') {
        logStep("Not a live media payment", { contentType: metadata?.content_type });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { message_id: messageId, user_id: userId, live_stream_id: liveStreamId, creator_id: creatorId } = metadata;

      if (!liveStreamId || !userId) {
        logStep("ERROR: Missing required metadata", { liveStreamId, userId });
        return new Response(JSON.stringify({ error: "Missing metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      logStep("Processing live media payment", { messageId, userId, liveStreamId });

      // Mettre à jour le statut du paiement
      const { error: updateError } = await supabaseClient
        .from('live_stream_payments')
        .update({ status: 'completed' })
        .eq('live_stream_id', liveStreamId)
        .eq('subscriber_id', userId)
        .eq('status', 'pending');

      if (updateError) {
        logStep("Warning: Error updating payment status", { error: updateError.message });
      }

      // Notification utilisateur
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'payment_success',
          title: 'Contenu débloqué !',
          message: 'Votre paiement a été confirmé. Le contenu est maintenant accessible.',
          data: {
            message_id: messageId,
            live_stream_id: liveStreamId,
            payment_type: 'live_media',
          },
        });

      // Notification créateur
      if (creatorId) {
        const { data: creatorData } = await supabaseClient
          .from('creators')
          .select('user_id')
          .eq('id', creatorId)
          .single();

        if (creatorData?.user_id) {
          const amount = session.amount_total ? session.amount_total / 100 : 0;
          
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: creatorData.user_id,
              type: 'sale',
              title: 'Vente de contenu !',
              message: `Quelqu'un a acheté votre contenu pour ${amount.toFixed(2)}€`,
              data: {
                message_id: messageId,
                live_stream_id: liveStreamId,
                amount,
                payment_type: 'live_media',
              },
            });
        }
      }

      // Créer un enregistrement de paiement si nécessaire
      const { data: existingPayment } = await supabaseClient
        .from('live_stream_payments')
        .select('id')
        .eq('stripe_payment_intent_id', session.payment_intent as string)
        .maybeSingle();

      const amount = session.amount_total ? session.amount_total / 100 : 0;

      if (!existingPayment) {
        await supabaseClient
          .from('live_stream_payments')
          .insert({
            live_stream_id: liveStreamId,
            subscriber_id: userId,
            amount,
            stripe_payment_intent_id: (session.payment_intent as string) || session.id,
            status: 'completed',
          });
      }

      // Enregistrer la commission de la plateforme
      if (creatorId && amount > 0) {
        const { data: creator } = await supabaseClient
          .from('creators')
          .select('platform_commission_rate')
          .eq('id', creatorId)
          .single();

        const commissionRate = creator?.platform_commission_rate || 0.15;
        const commissionAmount = amount * commissionRate;
        const creatorPayout = amount - commissionAmount;

        const now = new Date().toISOString();

        const { error: commissionError } = await supabaseClient
          .from('platform_commissions')
          .insert({
            creator_id: creatorId,
            total_revenue: amount,
            subscription_revenue: 0,
            tips_revenue: 0,
            live_revenue: amount,
            private_content_revenue: 0,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            creator_payout: creatorPayout,
            currency: 'EUR',
            period_start: now,
            period_end: now
          });

        if (commissionError) {
          logStep("Error recording commission", { error: commissionError.message });
        } else {
          logStep("Commission recorded", { revenue: amount, commission: commissionAmount });
        }
      }

      logStep("Live media payment processed successfully");
    }

    // Gérer les paiements échoués
    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      logStep("Payment failed or expired", { type: event.type });
      
      let metadata: Record<string, string> | null | undefined;
      
      if (event.type === "checkout.session.expired") {
        metadata = (event.data.object as Stripe.Checkout.Session).metadata;
      } else {
        metadata = (event.data.object as Stripe.PaymentIntent).metadata;
      }

      if (metadata?.content_type === 'live_media' && metadata.live_stream_id && metadata.user_id) {
        await supabaseClient
          .from('live_stream_payments')
          .update({ status: 'failed' })
          .eq('live_stream_id', metadata.live_stream_id)
          .eq('subscriber_id', metadata.user_id)
          .eq('status', 'pending');
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    const errorCorsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...errorCorsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
