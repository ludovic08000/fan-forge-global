/**
 * Edge Function pour activer un boost créateur après paiement Stripe
 * SECURISE: validation d'entrée, vérification session Stripe, protection anti-replay
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting en mémoire
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 requêtes par minute
const RATE_WINDOW = 60000;

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-CREATOR-BOOST] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Seules les requêtes POST sont acceptées
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    // Rate limiting par IP
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    if (!checkRateLimit(ipAddress)) {
      logStep("Rate limited", { ip: ipAddress });
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Parser et valider le body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { session_id } = body;
    
    // Validation du session_id
    if (!session_id || typeof session_id !== 'string' || session_id.length > 500) {
      logStep("Invalid session_id", { session_id: session_id ? 'provided' : 'missing' });
      return new Response(JSON.stringify({ error: "Session ID invalide" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Vérifier que ça commence bien par cs_ (checkout session)
    if (!session_id.startsWith('cs_')) {
      logStep("Invalid session_id format", { prefix: session_id.substring(0, 3) });
      return new Response(JSON.stringify({ error: "Format de session ID invalide" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ===== PROTECTION ANTI-REPLAY =====
    // Vérifier si cette session a déjà été utilisée
    const { data: existingSession, error: checkError } = await supabaseClient
      .from('processed_stripe_sessions')
      .select('id')
      .eq('session_id', session_id)
      .maybeSingle();

    if (checkError) {
      logStep("Error checking processed sessions", { error: checkError.message });
      // Ne pas bloquer en cas d'erreur DB, mais logger
    }

    if (existingSession) {
      logStep("Session already processed (replay attempt blocked)", { session_id });
      return new Response(JSON.stringify({ error: "Cette session a déjà été utilisée" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Retrieving Stripe session", { session_id });

    // Retrieve the checkout session from Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch (stripeError) {
      logStep("Stripe session retrieval failed", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
      return new Response(JSON.stringify({ error: "Session Stripe invalide ou expirée" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (session.payment_status !== "paid") {
      logStep("Payment not confirmed", { status: session.payment_status });
      return new Response(JSON.stringify({ error: "Paiement non confirmé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const metadata = session.metadata;
    if (!metadata || !metadata.creator_id || !metadata.duration_hours) {
      logStep("Invalid session metadata", { metadata });
      return new Response(JSON.stringify({ error: "Métadonnées de session invalides" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const creatorId = metadata.creator_id;
    const durationHours = parseFloat(metadata.duration_hours);

    // Validation de la durée
    if (isNaN(durationHours) || durationHours <= 0 || durationHours > 720) { // Max 30 jours
      logStep("Invalid duration", { duration: durationHours });
      return new Response(JSON.stringify({ error: "Durée de boost invalide" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Vérifier que le créateur existe
    const { data: creator, error: creatorError } = await supabaseClient
      .from("creators")
      .select("id, user_id")
      .eq("id", creatorId)
      .single();

    if (creatorError || !creator) {
      logStep("Creator not found", { creator_id: creatorId });
      return new Response(JSON.stringify({ error: "Créateur non trouvé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // ===== MARQUER LA SESSION COMME TRAITÉE (idempotence) =====
    const { error: insertError } = await supabaseClient
      .from('processed_stripe_sessions')
      .insert({
        session_id: session_id,
        session_type: 'creator_boost',
        creator_id: creatorId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        metadata: { duration_hours: durationHours, boost_type: metadata.boost_type || 'unknown' }
      });

    if (insertError) {
      // Si c'est une erreur de contrainte unique, c'est un replay
      if (insertError.code === '23505') {
        logStep("Session already processed (constraint violation)", { session_id });
        return new Response(JSON.stringify({ error: "Cette session a déjà été utilisée" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      logStep("Error marking session as processed", { error: insertError.message });
      // Continuer quand même pour ne pas bloquer le boost
    }

    // Calculate boost end time
    const now = new Date();
    const boostEndTime = new Date(now.getTime() + (durationHours * 60 * 60 * 1000));

    // Update creator to be featured until the boost end time
    const { error: updateError } = await supabaseClient
      .from("creators")
      .update({
        is_featured: true,
        featured_until: boostEndTime.toISOString()
      })
      .eq("id", creatorId);

    if (updateError) {
      logStep("Error updating creator", { error: updateError.message });
      return new Response(JSON.stringify({ error: "Erreur lors de l'activation du boost" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Boost activated successfully", { 
      creator_id: creatorId, 
      until: boostEndTime.toISOString(),
      duration_hours: durationHours 
    });

    return new Response(JSON.stringify({ 
      success: true,
      boost_active_until: boostEndTime.toISOString(),
      message: "Boost activé avec succès!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
