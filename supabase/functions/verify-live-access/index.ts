import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  console.log(`[VERIFY-LIVE-ACCESS] ${step}`, details || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

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
    if (!user) throw new Error("User not authenticated");

    const { liveStreamId } = await req.json();
    if (!liveStreamId) throw new Error("Missing liveStreamId");

    // Utiliser la fonction SQL has_live_access
    const { data: hasAccess, error } = await supabaseClient
      .rpc('has_live_access', {
        _subscriber_id: user.id,
        _live_stream_id: liveStreamId
      });

    if (error) throw error;

    logStep("Access check complete", { userId: user.id, streamId: liveStreamId, hasAccess });

    return new Response(JSON.stringify({ hasAccess: !!hasAccess }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      hasAccess: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
