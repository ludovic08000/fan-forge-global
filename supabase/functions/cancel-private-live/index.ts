import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-PRIVATE-LIVE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Fonction démarrée");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Non authentifié");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Non authentifié");
    }
    logStep("Utilisateur authentifié", { userId: user.id });

    const body = await req.json();
    const { requestId, reason } = body;

    if (!requestId) {
      throw new Error("ID de demande manquant");
    }

    // Récupérer la demande
    const { data: request, error: requestError } = await supabaseAdmin
      .from("private_live_requests")
      .select(`
        *,
        creators:creator_id (
          id,
          user_id,
          stage_name
        )
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      throw new Error("Demande de live privé introuvable");
    }

    // Vérifier que l'utilisateur est le créateur ou le demandeur
    const isCreator = request.creators?.user_id === user.id;
    const isRequester = request.requester_id === user.id;

    if (!isCreator && !isRequester) {
      throw new Error("Vous n'êtes pas autorisé à annuler cette demande");
    }

    logStep("Demande trouvée", { 
      requestId, 
      status: request.status,
      isCreator,
      isRequester,
      hasPaid: request.status === 'paid'
    });

    // Si le live a été payé, effectuer un remboursement
    if (request.status === 'paid' && request.stripe_payment_intent_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      logStep("Remboursement en cours", { paymentIntentId: request.stripe_payment_intent_id });

      // Créer le remboursement
      const refund = await stripe.refunds.create({
        payment_intent: request.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: {
          private_live_request_id: requestId,
          cancelled_by: isCreator ? "creator" : "requester",
          cancellation_reason: reason || "Annulation demandée"
        }
      });

      logStep("Remboursement créé", { refundId: refund.id, status: refund.status });

      // Mettre à jour le revenu
      await supabaseAdmin
        .from("private_live_revenue")
        .update({
          status: "refunded",
          refund_reason: reason || "Annulation du live privé",
          refunded_at: new Date().toISOString()
        })
        .eq("private_live_request_id", requestId);
    }

    // Mettre à jour le statut de la demande
    await supabaseAdmin
      .from("private_live_requests")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        cancellation_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    // Envoyer un message automatique
    const cancelledByName = isCreator ? request.creators?.stage_name : "L'utilisateur";
    const recipientMessage = request.status === 'paid' 
      ? `❌ Le live privé a été annulé par ${cancelledByName}.\n\n${reason ? `Raison: ${reason}\n\n` : ''}💰 Vous serez remboursé intégralement sous 5-10 jours ouvrés.`
      : `❌ Le live privé a été annulé par ${cancelledByName}.${reason ? `\n\nRaison: ${reason}` : ''}`;

    // Message pour l'autre partie
    await supabaseAdmin
      .from("private_messages")
      .insert({
        creator_id: request.creator_id,
        subscriber_id: request.requester_id,
        sender_type: isCreator ? "creator" : "subscriber",
        message_type: "text",
        content: recipientMessage
      });

    // Notification
    const notifyUserId = isCreator ? request.requester_id : request.creators?.user_id;
    if (notifyUserId) {
      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: notifyUserId,
          type: "live_cancelled",
          title: "Live privé annulé",
          message: request.status === 'paid' 
            ? `Le live privé a été annulé. Remboursement en cours.`
            : `Le live privé a été annulé.`,
          data: {
            request_id: requestId,
            refunded: request.status === 'paid'
          }
        });
    }

    logStep("Annulation terminée", { requestId, refunded: request.status === 'paid' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        refunded: request.status === 'paid',
        message: request.status === 'paid' 
          ? "Live annulé et remboursement initié"
          : "Live annulé"
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
