import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Delete expired referral codes
    const { data: deletedCodes, error } = await supabaseAdmin
      .from("referral_codes")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .not("expires_at", "is", null)
      .select("id, code");

    if (error) {
      console.error("Error deleting expired codes:", error);
      throw error;
    }

    console.log(`Deleted ${deletedCodes?.length || 0} expired referral codes`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCodes?.length || 0,
        deleted_codes: deletedCodes?.map(c => c.code) || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
