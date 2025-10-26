import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    if (!creator.stripe_account_id) {
      return new Response(
        JSON.stringify({
          connected: false,
          status: "not_connected",
          message: "Aucun compte Stripe Connect",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Vérifier le statut du compte Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const account = await stripe.accounts.retrieve(creator.stripe_account_id);

    console.log("Compte Stripe récupéré:", {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });

    // Mettre à jour le statut dans la base de données
    await supabaseClient
      .from("creators")
      .update({
        stripe_account_status: account.details_submitted ? "active" : "pending",
        stripe_onboarding_completed: account.details_submitted,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
      })
      .eq("id", creator.id);

    return new Response(
      JSON.stringify({
        connected: true,
        status: account.details_submitted ? "active" : "pending",
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements_due: account.requirements?.currently_due || [],
        requirements_past_due: account.requirements?.past_due || [],
        disabled_reason: (account as any).disabled_reason || account.requirements?.disabled_reason || null,
        message: account.details_submitted
          ? "Compte Stripe Connect actif"
          : "Onboarding Stripe en cours",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erreur vérification compte Stripe:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});