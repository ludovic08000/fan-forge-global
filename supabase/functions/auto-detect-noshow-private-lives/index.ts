import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_COMMISSION_RATE = 0.15;
const STRIPE_FEE_PERCENT = 0.029; // 2.9%
const STRIPE_FEE_FIXED = 0.25; // 0.25€

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-NOSHOW-DETECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Détection automatique des no-shows démarrée");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Trouver tous les lives privés payés dont la date + durée + 30 min de marge est passée
    // et qui n'ont pas encore été signalés comme no-show
    const now = new Date();
    const marginMinutes = 30;

    const { data: paidLives, error: fetchError } = await supabaseAdmin
      .from("private_live_requests")
      .select(`
        *,
        creators:creator_id (
          id,
          user_id,
          stage_name
        )
      `)
      .eq("status", "paid")
      .is("no_show_reported_at", null)
      .not("stripe_payment_intent_id", "is", null);

    if (fetchError) {
      throw new Error(`Erreur récupération lives: ${fetchError.message}`);
    }

    logStep("Lives payés trouvés", { count: paidLives?.length || 0 });

    let processedCount = 0;
    const results: any[] = [];

    for (const request of paidLives || []) {
      const liveDate = new Date(request.proposed_date);
      const durationMinutes = request.proposed_duration || 30;
      const liveEndTime = new Date(liveDate.getTime() + (durationMinutes + marginMinutes) * 60 * 1000);

      // Vérifier si le live aurait dû être terminé
      if (now < liveEndTime) {
        continue; // Pas encore passé, on ignore
      }

      logStep("No-show détecté", { 
        requestId: request.id, 
        proposedDate: request.proposed_date,
        shouldHaveEndedAt: liveEndTime.toISOString()
      });

      try {
        // Calculer les frais Stripe que le créateur va payer
        const grossAmount = request.price;
        const stripeFees = (grossAmount * STRIPE_FEE_PERCENT) + STRIPE_FEE_FIXED;
        
        // Rembourser le client intégralement
        const refund = await stripe.refunds.create({
          payment_intent: request.stripe_payment_intent_id,
          reason: "requested_by_customer",
          metadata: {
            private_live_request_id: request.id,
            refund_type: "auto_noshow",
            creator_penalty: stripeFees.toFixed(2)
          }
        });

        logStep("Remboursement créé", { refundId: refund.id, status: refund.status });

        // Mettre à jour le revenu avec pénalité créateur
        await supabaseAdmin
          .from("private_live_revenue")
          .update({
            status: "refunded",
            refund_reason: "No-show automatique détecté",
            refunded_at: new Date().toISOString(),
            creator_penalty: stripeFees
          })
          .eq("private_live_request_id", request.id);

        // Mettre à jour la demande
        await supabaseAdmin
          .from("private_live_requests")
          .update({
            status: "cancelled",
            no_show_reported_at: new Date().toISOString(),
            no_show_reported_by: "system",
            cancellation_reason: "No-show automatique - Le créateur n'a pas effectué le live",
            updated_at: new Date().toISOString()
          })
          .eq("id", request.id);

        // Envoyer un message d'excuse au client
        const formattedDate = new Date(request.proposed_date).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });

        await supabaseAdmin
          .from("private_messages")
          .insert({
            creator_id: request.creator_id,
            subscriber_id: request.requester_id,
            sender_type: "creator",
            message_type: "text",
            content: `😔 **Nous vous présentons nos excuses**\n\n` +
              `Le live privé prévu le **${formattedDate}** avec ${request.creators?.stage_name || 'le créateur'} n'a malheureusement pas eu lieu.\n\n` +
              `💳 **Vous avez été intégralement remboursé(e)** de ${grossAmount}€.\n` +
              `Le remboursement apparaîtra sur votre compte sous 5-10 jours ouvrés.\n\n` +
              `Nous sommes vraiment désolés pour ce désagrément. 🙏`
          });

        // Notification pour le client
        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: request.requester_id,
            type: "refund_processed",
            title: "Remboursement effectué 💳",
            message: `Le live privé n'a pas eu lieu. Vous avez été remboursé(e) de ${grossAmount}€.`,
            data: {
              request_id: request.id,
              amount: grossAmount,
              refund_type: "noshow"
            }
          });

        // Notification et message pour le créateur avec les pénalités
        if (request.creators?.user_id) {
          await supabaseAdmin
            .from("notifications")
            .insert({
              user_id: request.creators.user_id,
              type: "noshow_penalty",
              title: "⚠️ No-show détecté - Pénalité appliquée",
              message: `Vous n'avez pas effectué le live privé prévu. Le client a été remboursé. Frais Stripe à votre charge: ${stripeFees.toFixed(2)}€`,
              data: {
                request_id: request.id,
                penalty: stripeFees,
                refunded_amount: grossAmount
              }
            });

          // Message privé au créateur
          await supabaseAdmin
            .from("private_messages")
            .insert({
              creator_id: request.creator_id,
              subscriber_id: request.requester_id,
              sender_type: "subscriber",
              message_type: "text",
              content: `⚠️ **No-show détecté automatiquement**\n\n` +
                `Vous n'avez pas effectué le live privé prévu le **${formattedDate}**.\n\n` +
                `❌ Le client a été intégralement remboursé (${grossAmount}€).\n` +
                `💸 **Frais Stripe à votre charge:** ${stripeFees.toFixed(2)}€\n\n` +
                `Ces frais seront déduits de vos prochains gains. Merci de respecter vos engagements à l'avenir.`
            });
        }

        processedCount++;
        results.push({
          requestId: request.id,
          creatorId: request.creator_id,
          amount: grossAmount,
          stripeFees,
          status: "refunded"
        });

      } catch (refundError) {
        logStep("Erreur remboursement", { 
          requestId: request.id, 
          error: refundError instanceof Error ? refundError.message : String(refundError)
        });
        results.push({
          requestId: request.id,
          status: "error",
          error: refundError instanceof Error ? refundError.message : String(refundError)
        });
      }
    }

    logStep("Traitement terminé", { processed: processedCount, total: paidLives?.length || 0 });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        total: paidLives?.length || 0,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERREUR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
