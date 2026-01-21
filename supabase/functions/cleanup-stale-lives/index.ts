import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronSecret } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify cron secret - reject unauthorized requests
    if (!verifyCronSecret(req)) {
      console.error("[Cleanup Stale Lives] Unauthorized: Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[Cleanup] Starting cleanup of stale live streams...");

    // End lives with heartbeat > 2 minutes ago
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: staleLives, error: fetchError } = await supabase
      .from("live_streams")
      .select("id, title, creator_id, last_heartbeat")
      .eq("status", "live")
      .or(`last_heartbeat.is.null,last_heartbeat.lt.${twoMinutesAgo}`);

    if (fetchError) {
      console.error("[Cleanup] Error fetching stale lives:", fetchError);
      throw fetchError;
    }

    if (!staleLives || staleLives.length === 0) {
      console.log("[Cleanup] No stale lives found");
      return new Response(
        JSON.stringify({ success: true, cleaned: 0, message: "No stale lives found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Cleanup] Found ${staleLives.length} stale live(s) to clean up:`, 
      staleLives.map(l => ({ id: l.id, title: l.title, lastHeartbeat: l.last_heartbeat }))
    );

    // End these lives
    const { error: updateError } = await supabase
      .from("live_streams")
      .update({ 
        status: "ended", 
        ended_at: new Date().toISOString() 
      })
      .in("id", staleLives.map(l => l.id));

    if (updateError) {
      console.error("[Cleanup] Error updating stale lives:", updateError);
      throw updateError;
    }

    console.log(`[Cleanup] Successfully ended ${staleLives.length} stale live stream(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleaned: staleLives.length,
        lives: staleLives.map(l => l.id)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Cleanup] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
