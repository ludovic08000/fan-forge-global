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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non authentifié");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Non authentifié");
    const user = userData.user;

    // Récupérer le créateur lié à l'utilisateur
    const { data: creator, error: creatorError } = await supabaseClient
      .from("creators")
      .select("id, stripe_account_id")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creator) throw new Error("Profil créateur non trouvé");
    if (!creator.stripe_account_id) throw new Error("Aucun compte Stripe Connect associé");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Clé Stripe manquante");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "https://lovable.dev";
    const loginLink = await stripe.accounts.createLoginLink(creator.stripe_account_id, {
      redirect_url: `${origin}/dashboard`
    });

    return new Response(
      JSON.stringify({ url: loginLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Erreur stripe-connect-login-link:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Erreur inconnue" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});