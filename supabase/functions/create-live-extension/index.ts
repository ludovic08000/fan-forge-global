import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTENSION_PRICE_EUR = 500; // 5€ pour 20 minutes
const EXTENSION_DURATION_MINUTES = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;
    console.log("[create-live-extension] User:", user.id);

    const { liveStreamId } = await req.json();
    if (!liveStreamId) throw new Error("liveStreamId required");

    // Vérifier que c'est bien le créateur du live
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: stream, error: streamError } = await supabaseAdmin
      .from("live_streams")
      .select("id, title, creator_id, creators!inner(user_id)")
      .eq("id", liveStreamId)
      .single();

    if (streamError || !stream) throw new Error("Live stream not found");
    
    const creatorUserId = (stream.creators as any).user_id;
    if (creatorUserId !== user.id) throw new Error("Unauthorized - not the stream owner");

    console.log("[create-live-extension] Creating checkout for stream:", stream.title);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Chercher ou créer le client Stripe
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Créer une session de paiement one-time
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Extension Live +${EXTENSION_DURATION_MINUTES}min`,
              description: `Prolonger "${stream.title}" de ${EXTENSION_DURATION_MINUTES} minutes`,
            },
            unit_amount: EXTENSION_PRICE_EUR,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard?live_extended=true&stream_id=${liveStreamId}`,
      cancel_url: `${req.headers.get("origin")}/dashboard?live_extended=false`,
      metadata: {
        type: "live_extension",
        live_stream_id: liveStreamId,
        creator_id: stream.creator_id,
        extension_minutes: EXTENSION_DURATION_MINUTES.toString(),
      },
      payment_intent_data: {
        metadata: {
          type: "live_extension",
          live_stream_id: liveStreamId,
        },
      },
    });

    console.log("[create-live-extension] Checkout session created:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      extensionMinutes: EXTENSION_DURATION_MINUTES,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[create-live-extension] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
