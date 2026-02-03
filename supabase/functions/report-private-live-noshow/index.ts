import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REPORT-NOSHOW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Signalement no-show démarré");

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
    const { requestId } = body;

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

    // Seul le demandeur peut signaler un no-show
    if (request.requester_id !== user.id) {
      throw new Error("Seul le demandeur peut signaler un no-show");
    }

    // Vérifier que le live était payé
    if (request.status !== "paid") {
      throw new Error("Ce live n'a pas été payé");
    }

    // Vérifier que la date du live est passée (avec 30 min de marge)
    const liveDate = new Date(request.proposed_date);
    const now = new Date();
    const marginMinutes = 30;
    const liveEndTime = new Date(liveDate.getTime() + (request.proposed_duration || 30) * 60 * 1000 + marginMinutes * 60 * 1000);

    if (now < liveEndTime) {
      const remainingMinutes = Math.ceil((liveEndTime.getTime() - now.getTime()) / (60 * 1000));
      throw new Error(`Vous pourrez signaler un no-show dans ${remainingMinutes} minutes (après la fin prévue du live + 30 min de marge)`);
    }

    // Vérifier qu'un no-show n'a pas déjà été signalé
    if (request.no_show_reported_at) {
      throw new Error("Un no-show a déjà été signalé pour ce live");
    }

    logStep("Demande validée pour no-show", { 
      requestId, 
      liveDate: request.proposed_date,
      paymentIntentId: request.stripe_payment_intent_id
    });

    // Effectuer le remboursement
    if (request.stripe_payment_intent_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      logStep("Remboursement no-show en cours", { paymentIntentId: request.stripe_payment_intent_id });

      const refund = await stripe.refunds.create({
        payment_intent: request.stripe_payment_intent_id,
        reason: "requested_by_customer",
        metadata: {
          private_live_request_id: requestId,
          refund_type: "no_show",
          reported_by: user.id
        }
      });

      logStep("Remboursement créé", { refundId: refund.id, status: refund.status });

      // Mettre à jour le revenu
      await supabaseAdmin
        .from("private_live_revenue")
        .update({
          status: "refunded",
          refund_reason: "No-show du créateur",
          refunded_at: new Date().toISOString()
        })
        .eq("private_live_request_id", requestId);
    }

    // Mettre à jour la demande
    await supabaseAdmin
      .from("private_live_requests")
      .update({
        status: "cancelled",
        no_show_reported_at: new Date().toISOString(),
        no_show_reported_by: user.id,
        cancellation_reason: "No-show du créateur",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    // Message automatique
    await supabaseAdmin
      .from("private_messages")
      .insert({
        creator_id: request.creator_id,
        subscriber_id: request.requester_id,
        sender_type: "subscriber",
        message_type: "text",
        content: `⚠️ Live privé signalé comme non effectué. Remboursement intégral en cours (5-10 jours ouvrés).`
      });

    // Notification pour l'admin
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: request.creators?.user_id,
        type: "no_show_reported",
        title: "No-show signalé ⚠️",
        message: `Un utilisateur a signalé que vous n'avez pas effectué un live privé. Un remboursement a été effectué.`,
        data: {
          request_id: requestId,
          refunded: true
        }
      });

    logStep("No-show traité avec succès", { requestId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        refunded: true,
        message: "No-show signalé. Remboursement intégral initié."
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
