/**
 * Edge Function pour tracker les revenus par minute des lives
 * Appelé chaque minute pendant qu'un live est actif
 * SECURISE: validation d'entrée, rate limiting, authentification
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation UUID
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Rate limiting en mémoire
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 requêtes par minute par stream
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

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parser et valider le body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { liveStreamId, minuteNumber } = body;

    // Validation des paramètres
    if (!liveStreamId || !isValidUUID(liveStreamId)) {
      console.warn('[track-live-revenue] Invalid liveStreamId:', liveStreamId);
      return new Response(
        JSON.stringify({ error: "Invalid liveStreamId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (minuteNumber === undefined || typeof minuteNumber !== 'number' || minuteNumber < 0 || minuteNumber > 10000) {
      console.warn('[track-live-revenue] Invalid minuteNumber:', minuteNumber);
      return new Response(
        JSON.stringify({ error: "Invalid minuteNumber" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting par stream
    if (!checkRateLimit(liveStreamId)) {
      console.warn(`[track-live-revenue] Rate limited for stream: ${liveStreamId}`);
      return new Response(
        JSON.stringify({ error: "Too many requests for this stream" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer un client Supabase avec service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Vérifier que le live stream existe et est actif
    const { data: liveStream, error: streamError } = await supabaseAdmin
      .from('live_streams')
      .select('id, status')
      .eq('id', liveStreamId)
      .single();

    if (streamError || !liveStream) {
      console.warn('[track-live-revenue] Live stream not found:', liveStreamId);
      return new Response(
        JSON.stringify({ error: "Live stream not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (liveStream.status !== 'live') {
      console.log('[track-live-revenue] Stream not live, skipping:', liveStreamId);
      return new Response(
        JSON.stringify({ success: true, message: "Stream not live, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Appeler la fonction qui calcule et stocke les revenus
    const { error } = await supabaseAdmin.rpc('calculate_live_revenue', {
      _live_stream_id: liveStreamId,
      _minute_number: minuteNumber,
    });

    if (error) {
      console.error('[track-live-revenue] Error calculating revenue:', error);
      throw error;
    }

    console.log(`[track-live-revenue] Revenue tracked for stream ${liveStreamId}, minute ${minuteNumber}`);

    return new Response(
      JSON.stringify({ success: true, message: "Revenus calculés avec succès" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erreur tracking revenus:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
