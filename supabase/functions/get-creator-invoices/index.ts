import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-CREATOR-INVOICES] ${step}${detailsStr}`);
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

    // Récupérer le créateur
    const { data: creator, error: creatorError } = await supabaseClient
      .from("creators")
      .select("id, stripe_account_id, stage_name")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creator) {
      throw new Error("Profil créateur non trouvé");
    }
    logStep("Créateur trouvé", { creatorId: creator.id, hasStripeAccount: !!creator.stripe_account_id });

    // Paramètres de la requête
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const startingAfter = url.searchParams.get("starting_after") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Récupérer les factures Stripe liées au créateur via les metadata
    // Les factures sont créées automatiquement par Stripe pour les abonnements
    const listParams: Stripe.InvoiceListParams = {
      limit,
      expand: ['data.charge', 'data.subscription'],
    };

    if (startingAfter) {
      listParams.starting_after = startingAfter;
    }

    if (status) {
      listParams.status = status as Stripe.InvoiceListParams.Status;
    }

    // Récupérer toutes les factures et filtrer par metadata creator_id
    const allInvoices = await stripe.invoices.list(listParams);
    
    // Filtrer les factures qui concernent ce créateur (via metadata ou subscription)
    const creatorInvoices = allInvoices.data.filter(invoice => {
      // Vérifier les metadata de la facture
      if (invoice.metadata?.creator_id === creator.id) {
        return true;
      }
      // Vérifier les metadata de la subscription
      if (invoice.subscription && typeof invoice.subscription === 'object') {
        const sub = invoice.subscription as Stripe.Subscription;
        if (sub.metadata?.creator_id === creator.id) {
          return true;
        }
      }
      return false;
    });

    logStep("Factures récupérées", { count: creatorInvoices.length });

    // Formater les factures pour le frontend
    const formattedInvoices = creatorInvoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      due_date: invoice.due_date,
      paid_at: invoice.status_transitions?.paid_at,
      customer_email: invoice.customer_email,
      customer_name: invoice.customer_name,
      // URL pour télécharger le PDF
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      // Détails fiscaux
      tax: invoice.tax,
      total_tax_amounts: invoice.total_tax_amounts,
      subtotal: invoice.subtotal,
      total: invoice.total,
      // Informations de facturation
      billing_reason: invoice.billing_reason,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
    }));

    return new Response(
      JSON.stringify({
        invoices: formattedInvoices,
        has_more: allInvoices.has_more,
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
