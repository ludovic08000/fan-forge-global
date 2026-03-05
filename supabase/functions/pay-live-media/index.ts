import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAY-LIVE-MEDIA] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseAnon = createClient(
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
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { messageId, returnUrl } = await req.json();
    if (!messageId) throw new Error("Message ID is required");
    logStep("Message ID received", { messageId });

    // Récupérer le message du live stream
    const { data: messageData, error: messageError } = await supabaseClient
      .from('live_stream_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      logStep("Error fetching message", { error: messageError });
      throw new Error("Message not found");
    }

    logStep("Message found", { messageType: messageData.message_type });

    // Vérifier que c'est bien un média payant
    if (messageData.message_type !== 'paid_media' || !messageData.content_offer) {
      throw new Error("This is not a paid media message");
    }

    const contentOffer = messageData.content_offer as any;
    const price = contentOffer.price || 0;

    if (price <= 0) {
      throw new Error("This content is free");
    }

    logStep("Content offer", { price, type: contentOffer.media_type });

    // Récupérer les infos du créateur via le live stream
    const { data: liveStreamData, error: liveError } = await supabaseClient
      .from('live_streams')
      .select('creator_id, creators!inner(stage_name, stripe_account_id)')
      .eq('id', messageData.live_stream_id)
      .single();

    if (liveError || !liveStreamData) {
      logStep("Error fetching live stream", { error: liveError });
      throw new Error("Live stream not found");
    }

    const creatorName = (liveStreamData.creators as any)?.stage_name || 'Créateur';
    const creatorStripeAccountId = (liveStreamData.creators as any)?.stripe_account_id;

    logStep("Creator info", { creatorName, hasStripeAccount: !!creatorStripeAccountId });

    // Vérifier si l'utilisateur a déjà payé pour ce contenu
    const { data: existingPayment } = await supabaseClient
      .from('live_stream_payments')
      .select('id, status')
      .eq('live_stream_id', messageData.live_stream_id)
      .eq('subscriber_id', user.id)
      .eq('stripe_payment_intent_id', messageId) // Utiliser messageId comme identifiant
      .eq('status', 'completed')
      .maybeSingle();

    if (existingPayment) {
      logStep("Content already paid", { paymentId: existingPayment.id });
      // Retourner l'URL du média débloqué
      return new Response(JSON.stringify({ 
        alreadyPaid: true, 
        mediaUrl: contentOffer.media_url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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

    // Créer la session de checkout
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_update: {
        address: 'auto',
      },
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${contentOffer.media_type === 'video' ? 'Vidéo' : 'Photo'} exclusive de ${creatorName}`,
              description: `Déblocage de contenu exclusif en live`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      automatic_tax: { enabled: true },
      success_url: `${returnUrl || req.headers.get("origin")}?live_media_success=true&message_id=${messageId}`,
      cancel_url: `${returnUrl || req.headers.get("origin")}?live_media_canceled=true`,
      metadata: {
        message_id: messageId,
        live_stream_id: messageData.live_stream_id,
        user_id: user.id,
        content_type: 'live_media',
        creator_id: liveStreamData.creator_id,
      },
    };

    // Si le créateur a un compte Stripe Connect, utiliser le transfert automatique
    if (creatorStripeAccountId) {
      // Commission plateforme de 15%
      const platformFee = Math.round(price * 100 * (15 / 100));
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: creatorStripeAccountId,
        },
      };
      logStep("Stripe Connect configured", { platformFee, destination: creatorStripeAccountId });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Enregistrer le paiement en attente
    const { error: paymentError } = await supabaseClient
      .from('live_stream_payments')
      .insert({
        live_stream_id: messageData.live_stream_id,
        subscriber_id: user.id,
        amount: price,
        stripe_payment_intent_id: session.payment_intent as string || session.id,
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
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
