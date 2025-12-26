import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// CORS restreint aux domaines autorisés
const ALLOWED_ORIGINS = [
  "https://lovable.dev",
  "https://usjxcgauyvdocngfkhys.supabase.co",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => origin.includes(allowed.replace("https://", "")))
    ? origin
    : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PRIVATE-CONTENT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Seules les requêtes POST sont acceptées (+ OPTIONS pour preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
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

    // Traiter uniquement les événements pertinents
    if (event.type !== "checkout.session.completed") {
      logStep("Event type not handled", { eventType: event.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    
    // Vérifier le type de contenu
    if (session.metadata?.content_type !== "private_content") {
      logStep("Not a private content payment", { contentType: session.metadata?.content_type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const messageId = session.metadata.message_id;
    const userId = session.metadata.user_id;

    if (!messageId || !userId) {
      logStep("ERROR: Missing metadata", { messageId, userId });
      return new Response(JSON.stringify({ error: "Missing metadata" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Processing private content payment", { messageId, userId });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer le message pour connaître son type
    const { data: messageData } = await supabaseAdmin
      .from('private_messages')
      .select('message_type')
      .eq('id', messageId)
      .single();

    const isMediaRequest = messageData?.message_type === 'image_request' || messageData?.message_type === 'video_request';

    // Marquer le message comme payé et mettre à jour le statut pour les media requests
    const updateData: Record<string, unknown> = { 
      is_paid: true,
      stripe_payment_intent_id: session.payment_intent as string
    };
    
    // Pour les media requests, mettre le statut à 'paid'
    if (isMediaRequest) {
      updateData.status = 'paid';
    }

    const { error: updateError } = await supabaseAdmin
      .from('private_messages')
      .update(updateData)
      .eq('id', messageId);

    if (updateError) {
      logStep("Error updating message", { error: updateError.message });
      throw new Error(`Failed to update message: ${updateError.message}`);
    }

    // Mettre à jour le statut du paiement
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('private_content_payments')
      .update({ status: 'paid' })
      .eq('message_id', messageId)
      .eq('subscriber_id', userId);

    if (paymentUpdateError) {
      logStep("Warning: Error updating payment record", { error: paymentUpdateError.message });
    }

    logStep("Private content payment processed successfully");

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...getCorsHeaders(null), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
