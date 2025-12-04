import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REQUEST-CREATOR-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Début de la demande de paiement");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Authentification
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Non authentifié");
    }
    logStep("Utilisateur authentifié", { userId: user.id });

    // Récupérer le créateur
    const { data: creator, error: creatorError } = await supabaseClient
      .from("creators")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creator) {
      throw new Error("Profil créateur non trouvé");
    }
    logStep("Créateur trouvé", { creatorId: creator.id, stageName: creator.stage_name });

    // Vérifier que Stripe Connect est configuré
    if (!creator.stripe_account_id || !creator.stripe_onboarding_completed) {
      throw new Error("Veuillez configurer Stripe Connect avant de demander un paiement");
    }

    if (!creator.stripe_charges_enabled || !creator.stripe_payouts_enabled) {
      throw new Error("Votre compte Stripe n'est pas encore activé pour les paiements");
    }
    logStep("Stripe Connect vérifié", { stripeAccountId: creator.stripe_account_id });

    // Calculer la période selon la fréquence
    const now = new Date();
    let periodStart: Date;
    let periodEnd = now;

    if (creator.payment_frequency === "weekly") {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (creator.payment_frequency === "monthly") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      // Trimestriel
      const quarter = Math.floor(now.getMonth() / 3);
      periodStart = new Date(now.getFullYear(), quarter * 3, 1);
    }
    logStep("Période calculée", { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() });

    // Calculer le montant dû avec commission
    const { data: revenueData, error: revenueError } = await supabaseClient
      .rpc("calculate_creator_revenue_with_commission", {
        creator_uuid: creator.id,
        start_date: periodStart.toISOString(),
        end_date: periodEnd.toISOString(),
      });

    if (revenueError || !revenueData || revenueData.length === 0) {
      throw new Error("Erreur lors du calcul des revenus");
    }

    const revenueBreakdown = revenueData[0];
    const amount = revenueBreakdown.total_after_commission;
    logStep("Revenus calculés", revenueBreakdown);

    // Vérifier qu'il y a un montant à payer (minimum 1€)
    if (amount < 1) {
      throw new Error("Le montant minimum pour un retrait est de 1€");
    }

    // Vérifier s'il n'y a pas déjà une demande en cours
    const { data: existingRequest } = await supabaseClient
      .from("creator_payment_requests")
      .select("*")
      .eq("creator_id", creator.id)
      .in("status", ["pending", "processing"])
      .gte("created_at", periodStart.toISOString())
      .single();

    if (existingRequest) {
      throw new Error("Vous avez déjà une demande de paiement en cours pour cette période");
    }

    // Créer la demande de paiement avec statut "processing"
    const { data: paymentRequest, error: insertError } = await supabaseClient
      .from("creator_payment_requests")
      .insert({
        creator_id: creator.id,
        amount: amount,
        currency: creator.currency || "EUR",
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Erreur lors de la création de la demande de paiement");
    }
    logStep("Demande de paiement créée", { requestId: paymentRequest.id });

    // Traiter le paiement via Stripe immédiatement
    try {
      const amountInCents = Math.round(amount * 100);
      
      logStep("Création du transfert Stripe", { 
        amount: amountInCents, 
        currency: (creator.currency || "EUR").toLowerCase(),
        destination: creator.stripe_account_id 
      });

      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: (creator.currency || "EUR").toLowerCase(),
        destination: creator.stripe_account_id,
        description: `Paiement créateur - ${creator.stage_name || creator.id}`,
        metadata: {
          payment_request_id: paymentRequest.id,
          creator_id: creator.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      });

      logStep("Transfert Stripe créé", { transferId: transfer.id });

      // Mettre à jour la demande comme complétée
      await supabaseClient
        .from("creator_payment_requests")
        .update({
          status: "completed",
          stripe_transfer_id: transfer.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", paymentRequest.id);

      // Enregistrer la commission de la plateforme
      await supabaseClient
        .from("platform_commissions")
        .insert({
          creator_id: creator.id,
          payment_request_id: paymentRequest.id,
          total_revenue: revenueBreakdown.total_before_commission,
          subscription_revenue: revenueBreakdown.subscription_revenue,
          tips_revenue: revenueBreakdown.tips_revenue,
          live_revenue: revenueBreakdown.live_revenue,
          private_content_revenue: revenueBreakdown.private_content_revenue,
          commission_rate: creator.platform_commission_rate || 0.15,
          commission_amount: revenueBreakdown.commission_amount,
          creator_payout: amount,
          currency: creator.currency || "EUR",
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        });

      logStep("Paiement traité avec succès");

      return new Response(
        JSON.stringify({
          success: true,
          request: {
            ...paymentRequest,
            status: "completed",
            stripe_transfer_id: transfer.id,
          },
          message: `Paiement de ${amount.toFixed(2)}€ effectué avec succès sur votre compte Stripe !`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );

    } catch (stripeError: any) {
      logStep("Erreur Stripe", { error: stripeError.message });

      // Mettre à jour la demande comme échouée
      await supabaseClient
        .from("creator_payment_requests")
        .update({
          status: "failed",
          error_message: stripeError.message,
        })
        .eq("id", paymentRequest.id);

      throw new Error(`Erreur de transfert Stripe: ${stripeError.message}`);
    }

  } catch (error: any) {
    logStep("Erreur", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
