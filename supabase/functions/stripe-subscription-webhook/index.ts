import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // Vérifier la signature si le secret webhook est configuré
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err.message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Fallback sans vérification de signature (dev uniquement)
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification");
    }

    logStep("Event type", { type: event.type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Gérer les événements d'abonnement
    if (event.type === "customer.subscription.deleted" || 
        event.type === "customer.subscription.updated") {
      
      const subscription = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = subscription.id;
      const status = subscription.status;
      
      logStep("Processing subscription event", { 
        subscriptionId: stripeSubscriptionId, 
        status,
        eventType: event.type 
      });

      // Mapper les statuts Stripe vers nos statuts
      let newStatus: 'active' | 'canceled' | 'expired';
      if (status === 'active' || status === 'trialing') {
        newStatus = 'active';
      } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
        newStatus = 'canceled';
      } else {
        newStatus = 'expired';
      }

      // Pour les suppressions, toujours marquer comme annulé
      if (event.type === "customer.subscription.deleted") {
        newStatus = 'canceled';
      }

      // Mettre à jour l'abonnement dans notre base de données
      const { data: updatedSub, error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          end_date: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString() 
            : null
        })
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .select()
        .single();

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
      } else {
        logStep("Subscription updated successfully", { 
          subscriptionId: updatedSub?.id, 
          newStatus 
        });

        // Créer une notification pour l'abonné
        if (updatedSub && newStatus === 'canceled') {
          // Récupérer les infos du créateur
          const { data: creator } = await supabaseClient
            .from('creators')
            .select('stage_name, user_id')
            .eq('id', updatedSub.creator_id)
            .single();

          const { data: creatorProfile } = await supabaseClient
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', creator?.user_id)
            .single();

          const creatorName = creator?.stage_name || creatorProfile?.display_name || creatorProfile?.username || 'Créateur';

          await supabaseClient
            .from('notifications')
            .insert({
              user_id: updatedSub.subscriber_id,
              type: 'subscription_canceled',
              title: 'Abonnement annulé',
              message: `Votre abonnement à ${creatorName} a été annulé.`,
              data: {
                creator_id: updatedSub.creator_id,
                subscription_id: updatedSub.id
              }
            });

          logStep("Cancellation notification sent", { 
            subscriberId: updatedSub.subscriber_id 
          });
        }
      }
    }

    // Gérer le renouvellement réussi
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      
      if (subscriptionId) {
        logStep("Payment succeeded for subscription", { subscriptionId });
        
        // Mettre à jour le statut à actif
        const { error } = await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          logStep("Error updating subscription after payment", { error: error.message });
        } else {
          logStep("Subscription reactivated after payment");
        }
      }
    }

    // Gérer l'échec de paiement
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      const customerEmail = invoice.customer_email;
      
      if (subscriptionId) {
        logStep("Payment failed for subscription", { subscriptionId, customerEmail });
        
        // Récupérer l'abonnement pour notifier l'utilisateur
        const { data: sub } = await supabaseClient
          .from('subscriptions')
          .select('subscriber_id, creator_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub) {
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: sub.subscriber_id,
              type: 'payment_failed',
              title: 'Échec de paiement',
              message: 'Le renouvellement de votre abonnement a échoué. Veuillez mettre à jour vos informations de paiement.',
              data: {
                creator_id: sub.creator_id,
                subscription_id: subscriptionId
              }
            });

          logStep("Payment failure notification sent", { subscriberId: sub.subscriber_id });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
