import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }
  
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier que c'est un admin qui appelle
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Non authentifié");
    }

    // Vérifier le rôle admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("Accès refusé: admin uniquement");
    }

    const { requestId } = await req.json();

    if (!requestId) {
      throw new Error("ID de demande de paiement requis");
    }

    // Récupérer la demande de paiement avec les revenus détaillés
    const { data: paymentRequest, error: requestError } = await supabaseClient
      .from("creator_payment_requests")
      .select(`
        *,
        creators:creator_id (
          id,
          bank_iban,
          bank_bic,
          bank_account_holder,
          bank_country,
          stage_name,
          user_id,
          platform_commission_rate
        )
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !paymentRequest) {
      throw new Error("Demande de paiement non trouvée");
    }

    if (paymentRequest.status !== "pending") {
      throw new Error("Cette demande de paiement a déjà été traitée");
    }

    // Marquer comme en traitement
    await supabaseClient
      .from("creator_payment_requests")
      .update({ status: "processing" })
      .eq("id", requestId);

    // Vérifier que le créateur a un compte Stripe Connect actif
    if (!paymentRequest.creators.stripe_account_id) {
      throw new Error("Le créateur n'a pas configuré son compte Stripe Connect");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Vérifier le statut du compte
    const account = await stripe.accounts.retrieve(paymentRequest.creators.stripe_account_id);
    
    if (!account.payouts_enabled) {
      throw new Error("Le compte Stripe Connect du créateur n'est pas encore activé pour les virements");
    }

    // Récupérer l'email du créateur
    const { data: { user: creatorUser } } = await supabaseClient.auth.admin.getUserById(
      paymentRequest.creators.user_id
    );

    if (!creatorUser?.email) {
      throw new Error("Email du créateur non trouvé");
    }

    // Vérifier/créer le client Stripe
    let customers = await stripe.customers.list({ email: creatorUser.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: creatorUser.email,
        name: paymentRequest.creators.bank_account_holder,
        description: `Creator: ${paymentRequest.creators.stage_name}`,
      });
      customerId = customer.id;
    }

    // Créer le transfert vers le compte Connect du créateur
    const transfer = await stripe.transfers.create({
      amount: Math.round(paymentRequest.amount * 100), // Conversion en centimes
      currency: paymentRequest.currency.toLowerCase(),
      destination: paymentRequest.creators.stripe_account_id,
      description: `Paiement créateur ${paymentRequest.creators.stage_name} - Période ${new Date(paymentRequest.period_start).toLocaleDateString()} à ${new Date(paymentRequest.period_end).toLocaleDateString()}`,
      metadata: {
        creator_id: paymentRequest.creator_id,
        payment_request_id: requestId,
        period_start: paymentRequest.period_start,
        period_end: paymentRequest.period_end,
      },
    });

    // Calculer les revenus détaillés pour enregistrer la commission
    const { data: revenueData } = await supabaseClient
      .rpc("calculate_creator_revenue_with_commission", {
        creator_uuid: paymentRequest.creator_id,
        start_date: paymentRequest.period_start,
        end_date: paymentRequest.period_end,
      });

    const revenueBreakdown = revenueData?.[0];

    // Enregistrer la commission dans l'historique
    if (revenueBreakdown) {
      await supabaseClient
        .from("platform_commissions")
        .insert({
          creator_id: paymentRequest.creator_id,
          payment_request_id: requestId,
          period_start: paymentRequest.period_start,
          period_end: paymentRequest.period_end,
          subscription_revenue: revenueBreakdown.subscription_revenue,
          tips_revenue: revenueBreakdown.tips_revenue,
          live_revenue: revenueBreakdown.live_revenue,
          private_content_revenue: revenueBreakdown.private_content_revenue,
          total_revenue: revenueBreakdown.total_before_commission,
          commission_rate: paymentRequest.creators.platform_commission_rate || 0.15,
          commission_amount: revenueBreakdown.commission_amount,
          creator_payout: revenueBreakdown.total_after_commission,
          currency: paymentRequest.currency,
        });
    }

    // Mettre à jour la demande de paiement
    await supabaseClient
      .from("creator_payment_requests")
      .update({
        status: "completed",
        stripe_transfer_id: transfer.id,
        processed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    // Créer une notification pour le créateur
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: paymentRequest.creators.user_id,
        type: "payment_completed",
        title: "Paiement effectué",
        message: `Votre paiement de ${new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: paymentRequest.currency
        }).format(paymentRequest.amount)} a été transféré vers votre compte Stripe Connect.`,
        data: {
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          request_id: requestId,
          transfer_id: transfer.id,
        },
      });

    console.log("Transfert Stripe Connect créé avec succès:", transfer.id);

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        message: "Paiement transféré avec succès vers le compte Stripe Connect du créateur",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erreur traitement paiement:", error);

    // En cas d'erreur, marquer la demande comme échouée
    if (req.body) {
      try {
        const { requestId } = await req.json();
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        await supabaseClient
          .from("creator_payment_requests")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", requestId);
      } catch (e) {
        console.error("Erreur lors de la mise à jour du statut:", e);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});