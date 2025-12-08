import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting cleanup of paused creators...");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Appeler la fonction de nettoyage
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
