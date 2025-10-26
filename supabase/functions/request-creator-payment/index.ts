import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authentification
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Non authentifié");
    }

    // Récupérer le créateur
    const { data: creator, error: creatorError } = await supabaseClient
      .from("creators")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creator) {
      throw new Error("Profil créateur non trouvé");
    }

    // Vérifier que Stripe Connect est configuré
    if (!creator.stripe_account_id || !creator.stripe_onboarding_completed || !creator.stripe_payouts_enabled) {
      throw new Error("Veuillez configurer Stripe Connect avant de demander un paiement");
    }

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

    // Vérifier qu'il y a un montant à payer
    if (amount <= 0) {
      throw new Error("Aucun revenu disponible pour la période sélectionnée");
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

    // Créer la demande de paiement
    const { data: paymentRequest, error: insertError } = await supabaseClient
      .from("creator_payment_requests")
      .insert({
        creator_id: creator.id,
        amount: amount,
        currency: creator.currency || "EUR",
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Erreur lors de la création de la demande de paiement");
    }

    console.log("Demande de paiement créée:", paymentRequest);

    return new Response(
      JSON.stringify({
        success: true,
        request: paymentRequest,
        message: "Demande de paiement créée avec succès. Elle sera traitée sous peu.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});