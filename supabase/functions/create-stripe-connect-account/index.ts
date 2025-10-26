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

    // Vérifier si le créateur a déjà un compte Stripe Connect
    if (creator.stripe_account_id) {
      // Retourner le lien d'onboarding pour compléter le compte
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const accountLink = await stripe.accountLinks.create({
        account: creator.stripe_account_id,
        refresh_url: `${req.headers.get("origin")}/dashboard`,
        return_url: `${req.headers.get("origin")}/dashboard?stripe_connect=success`,
        type: "account_onboarding",
      });

      return new Response(
        JSON.stringify({
          account_id: creator.stripe_account_id,
          onboarding_url: accountLink.url,
          message: "Compte existant - Complétez l'onboarding",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Créer un nouveau compte Stripe Connect
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Récupérer le profil pour les infos
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", user.id)
      .single();

    const account = await stripe.accounts.create({
      type: "express",
      country: creator.bank_country || "FR",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_type: "individual",
      business_profile: {
        name: creator.stage_name || profile?.display_name || "Créateur",
        mcc: "7999", // Amusement and recreation services
        url: `${req.headers.get("origin")}/${profile?.display_name || creator.stage_name}`,
      },
      metadata: {
        creator_id: creator.id,
        user_id: user.id,
      },
    });

    console.log("Compte Stripe Connect créé:", account.id);

    // Sauvegarder l'ID du compte Stripe
    await supabaseClient
      .from("creators")
      .update({
        stripe_account_id: account.id,
        stripe_account_status: "pending",
      })
      .eq("id", creator.id);

    // Créer le lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/dashboard`,
      return_url: `${req.headers.get("origin")}/dashboard?stripe_connect=success`,
      type: "account_onboarding",
    });

    console.log("Lien d'onboarding créé:", accountLink.url);

    return new Response(
      JSON.stringify({
        account_id: account.id,
        onboarding_url: accountLink.url,
        message: "Compte Stripe Connect créé avec succès",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erreur création compte Stripe Connect:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});