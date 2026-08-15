import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyCronSecret } from "../_shared/auth.ts";

/**
 * Auto-cleanup des codes promo expirés - appelé par cron job
 * Désactive automatiquement les codes dont expires_at < now()
 * et ceux qui ont atteint leur max_uses
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    if (!verifyCronSecret(req)) {
      console.error("[Auto-Cleanup Codes] Unauthorized: Invalid cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // 1. Désactiver les codes expirés (expires_at dépassé)
    const { data: expiredCodes, error: expiredError } = await supabaseAdmin
      .from("referral_codes")
      .update({ is_active: false })
      .eq("is_active", true)
      .not("expires_at", "is", null)
      .lt("expires_at", now)
      .select("id, code, creator_id, expires_at");

    if (expiredError) {
      console.error("[Auto-Cleanup Codes] Error deactivating expired codes:", expiredError);
    }

    // 2. Désactiver les codes ayant atteint le max d'utilisations
    const { data: maxedCodes, error: maxedError } = await supabaseAdmin
      .from("referral_codes")
      .update({ is_active: false })
      .eq("is_active", true)
      .not("max_uses", "is", null)
      .filter("current_uses", "gte", "max_uses")
      .select("id, code, creator_id, max_uses, current_uses");

    if (maxedError) {
      console.error("[Auto-Cleanup Codes] Error deactivating maxed codes:", maxedError);
    }

    const expiredCount = expiredCodes?.length || 0;
    const maxedCount = maxedCodes?.length || 0;
    const totalCleaned = expiredCount + maxedCount;

    console.log(`[Auto-Cleanup Codes] Cleaned: ${expiredCount} expired, ${maxedCount} maxed out (total: ${totalCleaned})`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_deactivated: expiredCount,
        maxed_deactivated: maxedCount,
        total_cleaned: totalCleaned,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Auto-Cleanup Codes] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});