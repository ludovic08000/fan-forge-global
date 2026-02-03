import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyCronSecret } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PRIVATE-LIVE-REMINDERS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Vérification du secret CRON
    if (!verifyCronSecret(req)) {
      logStep("Accès refusé - CRON_SECRET invalide");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    logStep("Démarrage des rappels de lives privés");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);

    // Rappels 24h avant
    const { data: reminders24h, error: error24h } = await supabaseAdmin
      .from("private_live_requests")
      .select(`
        id,
        creator_id,
        requester_id,
        proposed_date,
        proposed_duration,
        price,
        creators:creator_id (
          user_id,
          stage_name
        )
      `)
      .eq("status", "paid")
      .eq("reminder_24h_sent", false)
      .lte("proposed_date", in24h.toISOString())
      .gt("proposed_date", now.toISOString());

    if (error24h) {
      logStep("Erreur récupération rappels 24h", error24h);
    } else if (reminders24h && reminders24h.length > 0) {
      logStep(`${reminders24h.length} rappels 24h à envoyer`);
      
      for (const request of reminders24h) {
        const liveDate = new Date(request.proposed_date);
        const formattedDate = liveDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });

        // Message pour le demandeur
        await supabaseAdmin
          .from("private_messages")
          .insert({
            creator_id: request.creator_id,
            subscriber_id: request.requester_id,
            sender_type: "creator",
            message_type: "text",
            content: `⏰ Rappel : Votre live privé est prévu demain ${formattedDate} (${request.proposed_duration || 30} min). Préparez-vous !`
          });

        // Notification pour le créateur
        const creatorData = request.creators as any;
        if (creatorData?.user_id) {
          await supabaseAdmin
            .from("notifications")
            .insert({
              user_id: creatorData.user_id,
              type: "live_reminder",
              title: "Live privé demain 📅",
              message: `Rappel : Vous avez un live privé prévu demain ${formattedDate}`,
              data: { request_id: request.id }
            });
        }

        // Marquer comme envoyé
        await supabaseAdmin
          .from("private_live_requests")
          .update({ reminder_24h_sent: true })
          .eq("id", request.id);
      }
    }

    // Rappels 1h avant
    const { data: reminders1h, error: error1h } = await supabaseAdmin
      .from("private_live_requests")
      .select(`
        id,
        creator_id,
        requester_id,
        proposed_date,
        proposed_duration,
        creators:creator_id (
          user_id,
          stage_name
        )
      `)
      .eq("status", "paid")
      .eq("reminder_1h_sent", false)
      .lte("proposed_date", in1h.toISOString())
      .gt("proposed_date", now.toISOString());

    if (error1h) {
      logStep("Erreur récupération rappels 1h", error1h);
    } else if (reminders1h && reminders1h.length > 0) {
      logStep(`${reminders1h.length} rappels 1h à envoyer`);
      
      for (const request of reminders1h) {
        // Message urgent pour le demandeur
        await supabaseAdmin
          .from("private_messages")
          .insert({
            creator_id: request.creator_id,
            subscriber_id: request.requester_id,
            sender_type: "creator",
            message_type: "text",
            content: `🔔 Votre live privé commence dans moins d'1 heure ! Soyez prêt(e).`
          });

        // Notification urgente pour le créateur
        const creatorData = request.creators as any;
        if (creatorData?.user_id) {
          await supabaseAdmin
            .from("notifications")
            .insert({
              user_id: creatorData.user_id,
              type: "live_reminder",
              title: "Live privé dans 1h ⚡",
              message: `Votre live privé commence bientôt ! Préparez-vous.`,
              data: { request_id: request.id, urgent: true }
            });
        }

        // Marquer comme envoyé
        await supabaseAdmin
          .from("private_live_requests")
          .update({ reminder_1h_sent: true })
          .eq("id", request.id);
      }
    }

    logStep("Rappels traités avec succès");

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_24h: reminders24h?.length || 0,
        reminders_1h: reminders1h?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERREUR", { message: errorMessage });
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
