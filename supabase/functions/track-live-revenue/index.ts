/**
 * Edge Function pour tracker les revenus par minute des lives
 * Appelé chaque minute pendant qu'un live est actif
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { liveStreamId, minuteNumber } = await req.json();

    if (!liveStreamId || minuteNumber === undefined) {
      throw new Error("liveStreamId et minuteNumber sont requis");
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

    // Appeler la fonction qui calcule et stocke les revenus
    const { error } = await supabaseAdmin.rpc('calculate_live_revenue', {
      _live_stream_id: liveStreamId,
      _minute_number: minuteNumber,
    });

    if (error) throw error;

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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
