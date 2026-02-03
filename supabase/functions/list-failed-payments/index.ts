import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-FAILED-PAYMENTS] ${step}${detailsStr}`);
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

    // Vérifier le rôle admin
    const { data: adminRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      throw new Error("Accès refusé - Admin uniquement");
    }
    logStep("Admin vérifié", { userId: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Récupérer les paramètres
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Récupérer les paiements échoués
    const failedPayments = await stripe.paymentIntents.list({
      limit,
    });

    // Filtrer pour ne garder que les échoués, annulés, etc.
    const problematicPayments = failedPayments.data.filter(pi => 
      ['canceled', 'requires_payment_method', 'requires_action'].includes(pi.status) ||
      (pi.last_payment_error !== null)
    );

    logStep("Paiements récupérés", { 
      total: failedPayments.data.length,
      problematic: problematicPayments.length 
    });

    // Formater les données
    const formattedPayments = problematicPayments.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
      customer_email: pi.receipt_email || pi.metadata?.customer_email || null,
      description: pi.description,
      error_code: pi.last_payment_error?.code || null,
      error_message: pi.last_payment_error?.message || null,
      error_type: pi.last_payment_error?.type || null,
      decline_code: pi.last_payment_error?.decline_code || null,
      metadata: pi.metadata
    }));

    // Récupérer aussi les charges échouées
    const failedCharges = await stripe.charges.list({
      limit,
    });

    const problematicCharges = failedCharges.data.filter(ch => 
      ch.status === 'failed' || ch.disputed || ch.refunded
    );

    const formattedCharges = problematicCharges.map(ch => ({
      id: ch.id,
      amount: ch.amount / 100,
      currency: ch.currency.toUpperCase(),
      status: ch.status,
      disputed: ch.disputed,
      refunded: ch.refunded,
      refund_amount: ch.amount_refunded / 100,
      created: new Date(ch.created * 1000).toISOString(),
      customer_email: ch.receipt_email || ch.billing_details?.email || null,
      description: ch.description,
      failure_code: ch.failure_code || null,
      failure_message: ch.failure_message || null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        failed_intents: formattedPayments,
        problematic_charges: formattedCharges
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
