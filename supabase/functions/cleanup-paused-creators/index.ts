import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronSecret } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // SECURITY: Verify cron secret - reject unauthorized requests
    if (!verifyCronSecret(req)) {
      console.error("[Cleanup Paused Creators] Unauthorized: Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting cleanup of paused creators...");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Call the cleanup function
    const { data, error } = await supabaseAdmin.rpc("cleanup_paused_creators");

    if (error) {
      console.error("Error cleaning up paused creators:", error);
      throw error;
    }

    console.log(`Cleanup completed. Deleted ${data} paused creator accounts.`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: data,
        message: `${data} compte(s) créateur(s) en pause supprimé(s)`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erreur lors du nettoyage",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
