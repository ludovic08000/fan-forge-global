import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAY-PRIVATE-CONTENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { messageId } = await req.json();
    if (!messageId) throw new Error("Message ID is required");
    logStep("Message ID received", { messageId });

    // Récupérer les informations du message
    const { data: messageData, error: messageError } = await supabaseClient
      .from('private_messages')
      .select(`
        *,
        creator:creators!creator_id(stage_name, user_id)
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      throw new Error("Message not found or error fetching message data");
    }

    // Vérifier que l'utilisateur est bien l'abonné de ce message
    if (messageData.subscriber_id !== user.id) {
      throw new Error("Unauthorized: You can only pay for your own messages");
    }

    // Vérifier que le message a un prix
    if (messageData.price <= 0) {
      throw new Error("This content is free");
    }

    // Vérifier que le contenu n'est pas déjà payé
    if (messageData.is_paid) {
      throw new Error("Content already paid");
    }

    logStep("Message data loaded", { 
      price: messageData.price, 
      creatorName: messageData.creator.stage_name 
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Vérifier si un client Stripe existe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      });
      customerId = customer.id;
      logStep("New Stripe customer created", { customerId });
    }

    // Créer la session de checkout pour un paiement unique
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Contenu privé de ${messageData.creator.stage_name}`,
              description: `Déblocage de contenu privé`,
            },
            unit_amount: Math.round(messageData.price * 100), // Convertir en centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard?payment_success=true`,
      cancel_url: `${req.headers.get("origin")}/creator/${messageData.creator_id}?payment_canceled=true`,
      metadata: {
        message_id: messageId,
        user_id: user.id,
        content_type: 'private_content',
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Enregistrer le paiement en attente
    const { error: paymentError } = await supabaseClient
      .from('private_content_payments')
      .insert({
        message_id: messageId,
        subscriber_id: user.id,
        amount: messageData.price,
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'pending',
      });

    if (paymentError) {
      logStep("Error creating payment record", { error: paymentError });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in pay-private-content", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});