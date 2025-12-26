import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authentifier l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Récupérer l'ID de l'abonnement depuis le body
    const { subscriptionId } = await req.json();
    if (!subscriptionId) throw new Error("Subscription ID is required");
    logStep("Subscription ID received", { subscriptionId });

    // Vérifier que l'abonnement appartient à l'utilisateur
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('id, stripe_subscription_id, subscriber_id, creator_id, status')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.subscriber_id !== user.id) {
      throw new Error("Unauthorized: This subscription does not belong to you");
    }

    if (subscription.status !== 'active') {
      throw new Error("This subscription is not active");
    }

    logStep("Subscription verified", { 
      subscriptionId: subscription.id,
      stripeSubscriptionId: subscription.stripe_subscription_id 
    });

    // Annuler l'abonnement dans Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    if (subscription.stripe_subscription_id) {
      // Annuler immédiatement (ou à la fin de la période avec cancel_at_period_end: true)
      const canceledSubscription = await stripe.subscriptions.cancel(
        subscription.stripe_subscription_id
      );
      
      logStep("Stripe subscription canceled", { 
        id: canceledSubscription.id,
        status: canceledSubscription.status 
      });

      // Le webhook Stripe mettra à jour la base de données automatiquement
      // Mais on peut aussi le faire ici pour une réponse immédiate
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) {
        logStep("Error updating local subscription", { error: updateError.message });
      } else {
        logStep("Local subscription updated to canceled");
      }

      // Créer une notification
      const { data: creator } = await supabaseClient
        .from('creators')
        .select('stage_name, user_id')
        .eq('id', subscription.creator_id)
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
          user_id: user.id,
          type: 'subscription_canceled',
          title: 'Abonnement annulé',
          message: `Votre abonnement à ${creatorName} a été annulé avec succès.`,
          data: {
            creator_id: subscription.creator_id,
            subscription_id: subscription.id
          }
        });

      logStep("Cancellation complete");

      return new Response(JSON.stringify({ 
        success: true,
        message: "Abonnement annulé avec succès"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Pas d'abonnement Stripe - juste mettre à jour la base de données
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) {
        throw new Error("Failed to cancel subscription");
      }

      logStep("Subscription canceled (no Stripe ID)");

      return new Response(JSON.stringify({ 
        success: true,
        message: "Abonnement annulé avec succès"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
