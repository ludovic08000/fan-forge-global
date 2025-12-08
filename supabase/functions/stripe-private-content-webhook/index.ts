import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PRIVATE-CONTENT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    const event = JSON.parse(body) as Stripe.Event;
    
    logStep("Event type", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Vérifier si c'est un paiement de contenu privé
      if (session.metadata?.content_type !== "private_content") {
        logStep("Not a private content payment, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const messageId = session.metadata.message_id;
      const userId = session.metadata.user_id;
      
      logStep("Processing private content payment", { messageId, userId });

      // Marquer le message comme payé
      const { error: updateError } = await supabaseAdmin
        .from('private_messages')
        .update({ 
          is_paid: true,
          stripe_payment_intent_id: session.payment_intent as string
        })
        .eq('id', messageId);

      if (updateError) {
        logStep("Error updating message", { error: updateError });
        throw updateError;
      }

      // Mettre à jour le statut du paiement
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('private_content_payments')
        .update({ status: 'paid' })
        .eq('message_id', messageId)
        .eq('subscriber_id', userId);

      if (paymentUpdateError) {
        logStep("Error updating payment record", { error: paymentUpdateError });
      }

      logStep("Private content payment processed successfully");
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
