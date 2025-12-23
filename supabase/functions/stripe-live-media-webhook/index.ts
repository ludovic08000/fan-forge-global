import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-LIVE-MEDIA-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Récupérer le body brut et la signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    let event: Stripe.Event;

    // Vérifier la signature du webhook si le secret est configuré
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Webhook signature verification failed", { error: err });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // En mode développement, parser directement l'événement
      event = JSON.parse(body);
      logStep("Webhook parsed (no signature verification - dev mode)");
    }

    logStep("Event type", { type: event.type });

    // Gérer les événements de paiement réussi
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { sessionId: session.id });

      const metadata = session.metadata;
      
      // Vérifier que c'est un paiement de média live
      if (metadata?.content_type !== 'live_media') {
        logStep("Not a live media payment, skipping", { contentType: metadata?.content_type });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messageId = metadata.message_id;
      const userId = metadata.user_id;
      const liveStreamId = metadata.live_stream_id;
      const creatorId = metadata.creator_id;

      logStep("Processing live media payment", { messageId, userId, liveStreamId });

      // Mettre à jour le statut du paiement
      const { error: updateError } = await supabaseClient
        .from('live_stream_payments')
        .update({ status: 'completed' })
        .eq('live_stream_id', liveStreamId)
        .eq('subscriber_id', userId)
        .eq('status', 'pending');

      if (updateError) {
        logStep("Error updating payment status", { error: updateError });
      } else {
        logStep("Payment status updated to completed");
      }

      // Créer une notification pour l'utilisateur
      const { error: notifError } = await supabaseClient
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

      if (notifError) {
        logStep("Error creating user notification", { error: notifError });
      }

      // Créer une notification pour le créateur
      if (creatorId) {
        // Récupérer le user_id du créateur
        const { data: creatorData } = await supabaseClient
          .from('creators')
          .select('user_id, stage_name')
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

          logStep("Creator notification created", { creatorUserId: creatorData.user_id });
        }
      }

      // Insérer un enregistrement de paiement dans live_stream_payments si nécessaire
      const { data: existingPayment } = await supabaseClient
        .from('live_stream_payments')
        .select('id')
        .eq('stripe_payment_intent_id', session.payment_intent as string)
        .maybeSingle();

      if (!existingPayment) {
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        
        await supabaseClient
          .from('live_stream_payments')
          .insert({
            live_stream_id: liveStreamId,
            subscriber_id: userId,
            amount,
            stripe_payment_intent_id: session.payment_intent as string || session.id,
            status: 'completed',
          });

        logStep("Payment record created");
      }

      logStep("Live media payment processed successfully");
    }

    // Gérer les paiements échoués
    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") {
      logStep("Payment failed or expired", { type: event.type });
      
      let metadata: any;
      
      if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        metadata = session.metadata;
      } else {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        metadata = paymentIntent.metadata;
      }

      if (metadata?.content_type === 'live_media') {
        const { error } = await supabaseClient
          .from('live_stream_payments')
          .update({ status: 'failed' })
          .eq('live_stream_id', metadata.live_stream_id)
          .eq('subscriber_id', metadata.user_id)
          .eq('status', 'pending');

        if (error) {
          logStep("Error updating failed payment", { error });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
