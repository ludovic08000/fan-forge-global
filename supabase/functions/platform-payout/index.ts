import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLATFORM-PAYOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Fonction démarrée");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier l'authentification admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Non authentifié");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Non authentifié");
    }

    // Vérifier le rôle admin via la table user_roles
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

    // Récupérer le solde disponible sur le compte Stripe
    const balance = await stripe.balance.retrieve();
    logStep("Solde récupéré", { balance: balance.available });

    // Calculer le montant disponible en EUR (ou autre devise principale)
    const availableEur = balance.available.find(b => b.currency === 'eur');
    const availableAmount = availableEur?.amount || 0;

    if (availableAmount <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Aucun solde disponible pour le retrait",
          balance: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Récupérer le body de la requête pour voir si on demande juste le solde ou un payout
    const body = await req.json().catch(() => ({}));
    const action = body.action || "balance"; // "balance" ou "payout"

    if (action === "balance") {
      // Retourner juste le solde
      return new Response(
        JSON.stringify({
          success: true,
          balance: availableAmount / 100, // Convertir en euros
          currency: "EUR",
          pending: (balance.pending.find(b => b.currency === 'eur')?.amount || 0) / 100
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Créer le payout vers le compte bancaire lié
    logStep("Création du payout", { amount: availableAmount });
    
    const payout = await stripe.payouts.create({
      amount: availableAmount,
      currency: "eur",
      description: "Retrait commissions plateforme",
      metadata: {
        admin_id: user.id,
        requested_at: new Date().toISOString()
      }
    });

    logStep("Payout créé", { payoutId: payout.id, status: payout.status });

    // Logger l'action admin
    await supabaseClient.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "platform_payout",
      target_type: "stripe_payout",
      target_id: payout.id,
      details: {
        amount: availableAmount / 100,
        currency: "EUR",
        status: payout.status,
        arrival_date: payout.arrival_date
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        payout: {
          id: payout.id,
          amount: payout.amount / 100,
          currency: payout.currency.toUpperCase(),
          status: payout.status,
          arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null
        }
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
