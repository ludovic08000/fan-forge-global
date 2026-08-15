import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateJwtAndGetUserId, verifyInternalSecret } from "../_shared/auth.ts";

/**
 * Envoie un message automatique d'un créateur vers un abonné.
 * L'appel est autorisé soit par INTERNAL_API_SECRET, soit par le JWT du créateur propriétaire.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { subscriptionId, messageType, creatorId, subscriberId } = await req.json();

    if (!subscriptionId || !messageType || !creatorId || !subscriberId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const internalCall = verifyInternalSecret(req);
    let callerUserId: string | null = null;
    if (!internalCall) {
      const auth = await validateJwtAndGetUserId(req.headers.get("Authorization"));
      if (!auth.userId) {
        return new Response(JSON.stringify({ error: auth.error || "Unauthorized" }), {
          status: auth.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      callerUserId = auth.userId;
    }

    const { data: creator, error: creatorError } = await supabase
      .from("creators")
      .select("user_id, stage_name")
      .eq("id", creatorId)
      .single();
    if (creatorError || !creator) {
      return new Response(JSON.stringify({ error: "Creator not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!internalCall && creator.user_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Ne jamais accepter une paire creator/subscriber inventée par l'appelant.
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("id", subscriptionId)
      .eq("creator_id", creatorId)
      .eq("subscriber_id", subscriberId)
      .maybeSingle();
    if (subscriptionError || !subscription) {
      return new Response(JSON.stringify({ error: "Subscription does not match creator/subscriber" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[send-auto-message] Processing ${messageType} for subscription ${subscriptionId}`);
    const logKey = `${messageType}${messageType.includes('expiration') ? '_' + new Date().toISOString().split('T')[0] : ''}`;
    const { data: existingLog } = await supabase.from("auto_message_logs").select("id").eq("subscription_id", subscriptionId).eq("message_type", logKey).maybeSingle();
    if (existingLog) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: autoMessage, error: msgError } = await supabase
      .from("creator_auto_messages")
      .select("*")
      .eq("creator_id", creatorId)
      .eq("message_type", messageType)
      .eq("is_enabled", true)
      .maybeSingle();
    if (msgError || !autoMessage) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_message_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: creatorProfile } = await supabase.from("profiles").select("username").eq("id", creator.user_id).single();
    const senderName = creator.stage_name || creatorProfile?.username || "Créateur";
    let personalizedContent = autoMessage.content;
    const { data: subscriberProfile } = await supabase.from("profiles").select("username, first_name").eq("id", subscriberId).single();
    const subscriberName = subscriberProfile?.first_name || subscriberProfile?.username || "cher abonné";
    personalizedContent = personalizedContent.replace(/\{subscriber_name\}/gi, subscriberName).replace(/\{creator_name\}/gi, senderName);

    const messageData: Record<string, any> = {
      creator_id: creatorId, subscriber_id: subscriberId, sender_id: creator.user_id,
      content: personalizedContent, message_type: 'text', price: 0, is_paid: true, is_deleted: false,
    };
    if (autoMessage.media_url) {
      messageData.media_url = autoMessage.media_url;
      messageData.message_type = autoMessage.media_type || 'image';
    }

    const { error: sendError } = await supabase.from("private_messages").insert(messageData);
    if (sendError) throw sendError;
    await supabase.from("auto_message_logs").insert({ subscription_id: subscriptionId, message_type: logKey });
    console.log(`[send-auto-message] Successfully sent ${messageType} message for subscription ${subscriptionId}`);

    return new Response(JSON.stringify({ success: true, sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[send-auto-message] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
