import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

/**
 * Envoie un message automatique d'un créateur vers un abonné
 * Utilisé pour: messages de bienvenue, alertes d'expiration
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { subscriptionId, messageType, creatorId, subscriberId } = await req.json();

    console.log(`[send-auto-message] Processing ${messageType} for subscription ${subscriptionId}`);

    // Vérifier si ce message a déjà été envoyé
    const logKey = `${messageType}${messageType.includes('expiration') ? '_' + new Date().toISOString().split('T')[0] : ''}`;
    const { data: existingLog } = await supabase
      .from("auto_message_logs")
      .select("id")
      .eq("subscription_id", subscriptionId)
      .eq("message_type", logKey)
      .maybeSingle();

    if (existingLog) {
      console.log(`[send-auto-message] Message ${messageType} already sent for subscription ${subscriptionId}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer le message automatique du créateur
    const { data: autoMessage, error: msgError } = await supabase
      .from("creator_auto_messages")
      .select("*")
      .eq("creator_id", creatorId)
      .eq("message_type", messageType)
      .eq("is_enabled", true)
      .maybeSingle();

    if (msgError || !autoMessage) {
      console.log(`[send-auto-message] No auto message configured for ${messageType} by creator ${creatorId}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "no_message_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer les infos du créateur pour l'envoi
    const { data: creator } = await supabase
      .from("creators")
      .select("user_id, stage_name")
      .eq("id", creatorId)
      .single();

    if (!creator) {
      throw new Error("Creator not found");
    }

    // Récupérer le profil du créateur
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", creator.user_id)
      .single();

    const senderName = creator.stage_name || creatorProfile?.username || "Créateur";

    // Personnaliser le message avec des variables
    let personalizedContent = autoMessage.content;
    
    // Récupérer le profil de l'abonné pour personnalisation
    const { data: subscriberProfile } = await supabase
      .from("profiles")
      .select("username, first_name")
      .eq("id", subscriberId)
      .single();

    const subscriberName = subscriberProfile?.first_name || subscriberProfile?.username || "cher abonné";
    
    // Remplacer les variables
    personalizedContent = personalizedContent
      .replace(/\{subscriber_name\}/gi, subscriberName)
      .replace(/\{creator_name\}/gi, senderName);

    // Prepare message data with optional media
    // IMPORTANT: private_messages uses creator_id + subscriber_id for conversation routing
    // and sender_id for display purposes. Both must be set correctly.
    const messageData: Record<string, any> = {
      creator_id: creatorId,
      subscriber_id: subscriberId,
      sender_id: creator.user_id,
      content: personalizedContent,
      message_type: 'text',
      price: 0,
      is_paid: true,
      is_deleted: false,
    };

    // Add media if present (only for welcome messages typically)
    if (autoMessage.media_url) {
      messageData.media_url = autoMessage.media_url;
      messageData.message_type = autoMessage.media_type || 'image';
    }

    // Envoyer le message privé
    const { error: sendError } = await supabase
      .from("private_messages")
      .insert(messageData);

    if (sendError) {
      console.error(`[send-auto-message] Failed to send message:`, sendError);
      throw sendError;
    }

    // Logger que le message a été envoyé
    await supabase
      .from("auto_message_logs")
      .insert({
        subscription_id: subscriptionId,
        message_type: logKey,
      });

    console.log(`[send-auto-message] Successfully sent ${messageType} message for subscription ${subscriptionId}`);

    return new Response(
      JSON.stringify({ success: true, sent: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-auto-message] Error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
