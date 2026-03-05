import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-PAYOUT-INVOICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    logStep("Fonction démarrée");

    const supabaseClient = createClient(
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

    const { paymentRequestId } = await req.json();
    if (!paymentRequestId) {
      throw new Error("ID de demande de paiement requis");
    }

    // Récupérer la demande de paiement avec les détails du créateur
    const { data: paymentRequest, error: prError } = await supabaseClient
      .from("creator_payment_requests")
      .select(`
        *,
        creator:creator_id(
          id,
          user_id,
          stage_name,
          stripe_account_id,
          bank_iban,
          bank_bic,
          bank_country,
          bank_account_holder,
          tax_id,
          platform_commission_rate
        )
      `)
      .eq("id", paymentRequestId)
      .single();

    if (prError || !paymentRequest) {
      throw new Error("Demande de paiement non trouvée");
    }

    // Vérifier que l'utilisateur est bien le créateur
    if (paymentRequest.creator.user_id !== user.id) {
      throw new Error("Non autorisé");
    }

    logStep("Demande de paiement trouvée", { 
      amount: paymentRequest.amount,
      status: paymentRequest.status 
    });

    // Récupérer le profil pour les infos supplémentaires
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", user.id)
      .single();

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculer les détails de la facture
    const grossAmount = paymentRequest.amount;
    const commissionRate = (paymentRequest.creator.platform_commission_rate || 15) / 100;
    const commissionAmount = grossAmount * commissionRate;
    const netAmount = grossAmount - commissionAmount;

    // Déterminer le taux de TVA selon le pays
    const country = paymentRequest.creator.bank_country || 'FR';
    let vatRate = 0.20; // Taux par défaut France
    const vatRates: Record<string, number> = {
      'FR': 0.20, 'DE': 0.19, 'ES': 0.21, 'IT': 0.22,
      'BE': 0.21, 'NL': 0.21, 'PT': 0.23, 'AT': 0.20,
      'CH': 0.077, 'GB': 0.20, 'LU': 0.17,
    };
    vatRate = vatRates[country] || 0.20;

    // Calculer TVA sur la commission uniquement (la plateforme facture sa commission)
    const vatOnCommission = commissionAmount * vatRate;
    const totalCommissionWithVat = commissionAmount + vatOnCommission;

    // Créer une facture Stripe pour le créateur (payout)
    // D'abord, vérifier ou créer le client Stripe pour le créateur
    let creatorCustomerId: string;
    
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      creatorCustomerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: paymentRequest.creator.stage_name || profile?.display_name || user.email,
        metadata: {
          creator_id: paymentRequest.creator.id,
          type: 'creator',
        },
      });
      creatorCustomerId = newCustomer.id;
    }

    logStep("Client Stripe créateur", { customerId: creatorCustomerId });

    // Créer la facture
    const invoice = await stripe.invoices.create({
      customer: creatorCustomerId,
      collection_method: 'send_invoice',
      days_until_due: 0, // Déjà payé
      auto_advance: false,
      metadata: {
        type: 'creator_payout',
        creator_id: paymentRequest.creator.id,
        payment_request_id: paymentRequestId,
        period_start: paymentRequest.period_start,
        period_end: paymentRequest.period_end,
      },
      custom_fields: [
        {
          name: 'Période',
          value: `${new Date(paymentRequest.period_start).toLocaleDateString('fr-FR')} - ${new Date(paymentRequest.period_end).toLocaleDateString('fr-FR')}`,
        },
        {
          name: 'IBAN',
          value: paymentRequest.creator.bank_iban ? 
            `****${paymentRequest.creator.bank_iban.slice(-4)}` : 
            'Non renseigné',
        },
      ],
      footer: `Facture générée automatiquement pour le paiement créateur #${paymentRequestId.slice(0, 8)}`,
    });

    logStep("Facture créée", { invoiceId: invoice.id });

    // Ajouter les lignes de facture
    // Ligne 1: Revenus bruts
    await stripe.invoiceItems.create({
      customer: creatorCustomerId,
      invoice: invoice.id,
      amount: Math.round(grossAmount * 100),
      currency: paymentRequest.currency.toLowerCase(),
      description: `Revenus bruts - Période du ${new Date(paymentRequest.period_start).toLocaleDateString('fr-FR')} au ${new Date(paymentRequest.period_end).toLocaleDateString('fr-FR')}`,
    });

    // Ligne 2: Commission plateforme (négatif)
    await stripe.invoiceItems.create({
      customer: creatorCustomerId,
      invoice: invoice.id,
      amount: -Math.round(totalCommissionWithVat * 100),
      currency: paymentRequest.currency.toLowerCase(),
      description: `Commission plateforme (${(commissionRate * 100).toFixed(0)}% + TVA ${(vatRate * 100).toFixed(0)}%)`,
    });

    // Finaliser la facture
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    logStep("Facture finalisée", { invoiceId: finalizedInvoice.id });

    // Marquer comme payée si le paiement a été effectué
    if (paymentRequest.status === 'paid' || paymentRequest.status === 'completed') {
      await stripe.invoices.pay(finalizedInvoice.id, {
        paid_out_of_band: true,
      });
      logStep("Facture marquée comme payée");
    }

    // Récupérer la facture mise à jour avec l'URL PDF
    const updatedInvoice = await stripe.invoices.retrieve(finalizedInvoice.id);

    // Sauvegarder la référence de la facture
    await supabaseClient
      .from("creator_invoices")
      .upsert({
        id: invoice.id,
        creator_id: paymentRequest.creator.id,
        payment_request_id: paymentRequestId,
        invoice_number: updatedInvoice.number || `INV-${Date.now()}`,
        period_start: paymentRequest.period_start,
        period_end: paymentRequest.period_end,
        gross_amount: grossAmount,
        platform_commission_rate: commissionRate,
        platform_commission_amount: commissionAmount,
        vat_rate: vatRate,
        vat_amount: vatOnCommission,
        net_amount: netAmount,
        currency: paymentRequest.currency,
        status: updatedInvoice.status || 'draft',
        creator_name: paymentRequest.creator.stage_name || profile?.display_name || '',
        creator_iban: paymentRequest.creator.bank_iban,
        creator_country: country,
        creator_tax_id: paymentRequest.creator.tax_id,
      }, {
        onConflict: 'id',
      });

    return new Response(
      JSON.stringify({
        invoice_id: updatedInvoice.id,
        invoice_number: updatedInvoice.number,
        invoice_pdf: updatedInvoice.invoice_pdf,
        hosted_invoice_url: updatedInvoice.hosted_invoice_url,
        status: updatedInvoice.status,
        amount_due: updatedInvoice.amount_due,
        amount_paid: updatedInvoice.amount_paid,
        total: updatedInvoice.total,
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
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
