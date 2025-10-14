import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-LIVE-CHECKOUT] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { liveStreamId } = await req.json();
    if (!liveStreamId) throw new Error("Missing liveStreamId");

    // Vérifier si le live existe et est premium
    const { data: liveStream, error: liveError } = await supabaseClient
      .from('live_streams')
      .select('*, creator:creator_id(id, user_id, subscription_price)')
      .eq('id', liveStreamId)
      .single();

    if (liveError || !liveStream) throw new Error("Live stream not found");
    if (!liveStream.is_premium) throw new Error("This live stream is free");
    logStep("Live stream found", { streamId: liveStreamId, price: liveStream.price });

    // Vérifier si l'utilisateur a déjà payé
    const { data: existingPayment } = await supabaseClient
      .from('live_stream_payments')
      .select('*')
      .eq('live_stream_id', liveStreamId)
      .eq('subscriber_id', user.id)
      .eq('status', 'paid')
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ 
        message: "Already paid",
        hasAccess: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Vérifier si abonné au créateur
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('subscriber_id', user.id)
      .eq('creator_id', liveStream.creator_id)
      .eq('status', 'active')
      .maybeSingle();

    if (subscription) {
      return new Response(JSON.stringify({ 
        message: "Access through subscription",
        hasAccess: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Créer le paiement Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const amountInCents = Math.round(liveStream.price * 100);
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Accès Live: ${liveStream.title}`,
              description: `Accès unique au live premium`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/live/${liveStreamId}?payment_success=true`,
      cancel_url: `${req.headers.get("origin")}/live/${liveStreamId}?payment_canceled=true`,
      metadata: {
        live_stream_id: liveStreamId,
        subscriber_id: user.id,
      },
    });

    // Créer l'entrée de paiement en attente
    await supabaseClient
      .from('live_stream_payments')
      .insert({
        live_stream_id: liveStreamId,
        subscriber_id: user.id,
        amount: liveStream.price,
        stripe_payment_intent_id: session.payment_intent as string,
        status: 'pending',
      });

    logStep("Checkout session created", { sessionId: session.id });

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