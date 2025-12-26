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

  // Client avec anon key pour l'authentification utilisateur
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Client avec service role pour contourner les RLS et lire les messages
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { messageId } = await req.json();
    if (!messageId) throw new Error("Message ID is required");
    logStep("Message ID received", { messageId });

    // Récupérer les informations du message
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('private_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      logStep("Message fetch error", { error: messageError });
      throw new Error("Message not found or error fetching message data");
    }

    // Récupérer les informations du créateur séparément
    const { data: creatorData, error: creatorError } = await supabaseAdmin
      .from('creators')
      .select('id, stage_name, user_id, stripe_account_id')
      .eq('id', messageData.creator_id)
      .single();

    if (creatorError || !creatorData) {
      logStep("Creator fetch error", { error: creatorError });
      throw new Error("Creator not found");
    }

    // Attacher les données du créateur au message
    const messageWithCreator = { ...messageData, creator: creatorData };

    // Vérifier que l'utilisateur est bien l'abonné de ce message
    if (messageData.subscriber_id !== user.id) {
      throw new Error("Unauthorized: You can only pay for your own messages");
    }

    // Pour les media requests, vérifier que le statut est bien 'price_set'
    const isMediaRequest = messageData.message_type === 'image_request' || messageData.message_type === 'video_request';
    if (isMediaRequest && messageData.status !== 'price_set') {
      throw new Error("This media request is not ready for payment. Wait for the creator to set a price.");
    }

    // Vérifier que le message a un prix
    if (!messageData.price || messageData.price <= 0) {
      throw new Error("This content is free or has no price set");
    }

    // Vérifier que le contenu n'est pas déjà payé
    if (messageData.is_paid) {
      throw new Error("Content already paid");
    }

    logStep("Message data loaded", { 
      price: messageData.price, 
      creatorName: messageWithCreator.creator.stage_name 
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

    const amountInCents = Math.round(messageData.price * 100);

    // Déterminer le nom et la description du produit selon le type
    const productName = isMediaRequest 
      ? `Paiement média pour ${messageWithCreator.creator.stage_name}`
      : `Contenu privé de ${messageWithCreator.creator.stage_name}`;
    const productDescription = isMediaRequest
      ? `Paiement pour votre ${messageData.message_type === 'video_request' ? 'vidéo' : 'photo'} envoyée`
      : `Déblocage de contenu privé`;

    // Préparer les paramètres de la session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Activer Stripe Tax pour le calcul automatique des taxes
      automatic_tax: { enabled: true },
      // Générer une facture pour ce paiement
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            message_id: messageId,
            creator_id: messageData.creator_id,
            content_type: 'private_content',
          },
        },
      },
      success_url: `${req.headers.get("origin")}/dashboard?payment_success=true`,
      cancel_url: `${req.headers.get("origin")}/creator/${messageData.creator_id}?payment_canceled=true`,
      metadata: {
        message_id: messageId,
        user_id: user.id,
        content_type: 'private_content',
      },
    };

    // Si le créateur a Stripe Connect, ajouter le transfer avec 15% commission
    if (messageWithCreator.creator?.stripe_account_id) {
      sessionParams.payment_intent_data = {
        transfer_data: {
          destination: messageWithCreator.creator.stripe_account_id,
        },
        application_fee_amount: Math.round(amountInCents * 0.15),
      };
      logStep("Stripe Connect transfer configured", { 
        destination: messageWithCreator.creator.stripe_account_id,
        fee: Math.round(amountInCents * 0.15)
      });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Enregistrer le paiement en attente
    const { error: paymentError } = await supabaseAdmin
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