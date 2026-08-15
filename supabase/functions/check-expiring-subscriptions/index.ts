import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { verifyCronSecret } from "../_shared/auth.ts";

/**
 * CRON JOB: Vérifie les abonnements qui expirent bientôt et envoie les alertes
 * Doit être appelé quotidiennement via un scheduler externe
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  if (!verifyCronSecret(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalApiSecret = Deno.env.get("INTERNAL_API_SECRET");
    if (!internalApiSecret) {
      throw new Error("INTERNAL_API_SECRET not configured");
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[check-expiring-subscriptions] Starting check...");

    const { data: expirationMessages, error: msgError } = await supabase
      .from("creator_auto_messages")
      .select("creator_id, days_before_expiration, message_type")
      .in("message_type", ["expiration_warning", "expiration_final"])
      .eq("is_enabled", true);

    if (msgError) throw msgError;

    if (!expirationMessages || expirationMessages.length === 0) {
      console.log("[check-expiring-subscriptions] No expiration messages configured");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creatorSettings = new Map<string, number[]>();
    for (const msg of expirationMessages) {
      if (msg.days_before_expiration) {
        const existing = creatorSettings.get(msg.creator_id) || [];
        existing.push(msg.days_before_expiration);
        creatorSettings.set(msg.creator_id, existing);
      }
    }

    let totalProcessed = 0;
    let totalSent = 0;

    for (const [creatorId, daysList] of creatorSettings) {
      for (const daysBeforeExpiration of daysList) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysBeforeExpiration);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        const { data: subscriptions, error: subError } = await supabase
          .from("subscriptions")
          .select("id, subscriber_id, current_period_end")
          .eq("creator_id", creatorId)
          .eq("status", "active")
          .gte("current_period_end", `${targetDateStr}T00:00:00Z`)
          .lt("current_period_end", `${targetDateStr}T23:59:59Z`);

        if (subError) {
          console.error(`[check-expiring-subscriptions] Error fetching subscriptions:`, subError);
          continue;
        }
        if (!subscriptions || subscriptions.length === 0) continue;

        console.log(`[check-expiring-subscriptions] Found ${subscriptions.length} subscriptions expiring in ${daysBeforeExpiration} days for creator ${creatorId}`);
        const messageType = daysBeforeExpiration === 1 ? "expiration_final" : "expiration_warning";

        for (const sub of subscriptions) {
          totalProcessed++;
          try {
            const response = await fetch(`${supabaseUrl}/functions/v1/send-auto-message`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-secret": internalApiSecret,
              },
              body: JSON.stringify({
                subscriptionId: sub.id,
                messageType,
                creatorId,
                subscriberId: sub.subscriber_id,
              }),
            });

            const result = await response.json();
            if (result.sent) totalSent++;
          } catch (err) {
            console.error(`[check-expiring-subscriptions] Failed to send message for subscription ${sub.id}:`, err);
          }
        }
      }
    }

    console.log(`[check-expiring-subscriptions] Completed. Processed: ${totalProcessed}, Sent: ${totalSent}`);
    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-expiring-subscriptions] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});