import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const EXTENSION_DURATION_MINUTES = 20;
const PLATFORM_COMMISSION_RATE = 0.15; // 15%

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    
    const user = userData.user;

    const { liveStreamId, sessionId } = await req.json();
    if (!liveStreamId || !sessionId) throw new Error("liveStreamId and sessionId required");

    console.log("[confirm-live-extension] Checking session:", sessionId);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Vérifier le paiement
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    if (session.metadata?.live_stream_id !== liveStreamId) {
      throw new Error("Session does not match live stream");
    }

    console.log("[confirm-live-extension] Payment confirmed for stream:", liveStreamId);

    // Récupérer le live et vérifier la propriété
    const { data: stream, error: streamError } = await supabaseAdmin
      .from("live_streams")
      .select("id, creator_id, max_duration_minutes, extension_count, creators!inner(user_id)")
      .eq("id", liveStreamId)
      .single();

    if (streamError || !stream) throw new Error("Live stream not found");
    
    const creatorUserId = (stream.creators as any).user_id;
    if (creatorUserId !== user.id) throw new Error("Unauthorized");

    // Mettre à jour la durée max du live
    const currentMaxDuration = stream.max_duration_minutes || 20;
    const newMaxDuration = currentMaxDuration + EXTENSION_DURATION_MINUTES;
    const newExtensionCount = (stream.extension_count || 0) + 1;

    const { error: updateError } = await supabaseAdmin
      .from("live_streams")
      .update({ 
        max_duration_minutes: newMaxDuration,
        extension_count: newExtensionCount,
      })
      .eq("id", liveStreamId);

    if (updateError) throw updateError;

    console.log("[confirm-live-extension] Extended to", newMaxDuration, "minutes");

    // Enregistrer la commission plateforme (15%)
    const amountPaid = session.amount_total || 500;
    const commission = Math.round(amountPaid * PLATFORM_COMMISSION_RATE);

    await supabaseAdmin
      .from("platform_commissions")
      .insert({
        creator_id: stream.creator_id,
        amount: commission / 100, // Convertir en euros
        source_type: "live_extension",
        source_id: liveStreamId,
        commission_rate: PLATFORM_COMMISSION_RATE,
      });

    console.log("[confirm-live-extension] Commission recorded:", commission / 100, "€");

    return new Response(JSON.stringify({ 
      success: true,
      newMaxDuration,
      extensionCount: newExtensionCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[confirm-live-extension] Error:", error.message);
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
