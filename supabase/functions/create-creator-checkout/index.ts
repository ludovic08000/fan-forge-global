import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREATOR-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    
    // Créer un client avec la clé anon pour l'authentification
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Récupérer les données de la requête
    const { creatorId } = await req.json();
    if (!creatorId) throw new Error("Creator ID is required");
    logStep("Creator ID received", { creatorId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Paralléliser les requêtes créateur et client Stripe
    const [creatorResult, customersResult] = await Promise.all([
      supabaseClient
        .from('creators')
        .select('subscription_price, currency, stage_name, stripe_price_id, stripe_product_id')
        .eq('id', creatorId)
        .single(),
      stripe.customers.list({ email: user.email, limit: 1 })
    ]);

    const { data: creatorData, error: creatorError } = creatorResult;
    if (creatorError || !creatorData) {
      throw new Error("Creator not found or error fetching creator data");
    }

    if (creatorData.subscription_price <= 0) {
      throw new Error("Creator has free subscription - no payment needed");
    }

    logStep("Creator data loaded", { 
      price: creatorData.subscription_price, 
      currency: creatorData.currency,
      stageName: creatorData.stage_name,
      hasPriceId: !!creatorData.stripe_price_id 
    });

    // Gérer le client Stripe
    let customerId;
    if (customersResult.data.length > 0) {
      customerId = customersResult.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      });
      customerId = customer.id;
      logStep("New Stripe customer created", { customerId });
    }

    let priceId = creatorData.stripe_price_id;
    
    // Si le price_id n'existe pas ou si le prix a changé, créer/recréer le produit et le prix
    if (!priceId) {
      logStep("No price_id stored, creating product and price");
      
      let productId = creatorData.stripe_product_id;
      
      // Créer un produit Stripe s'il n'existe pas
      if (!productId) {
        const productName = `Abonnement ${creatorData.stage_name || 'Créateur'}`;
        const product = await stripe.products.create({
          name: productName,
          metadata: {
            creator_id: creatorId,
          },
        });
        productId = product.id;
        logStep("New product created", { productId });
        
        // Sauvegarder le product_id
        await supabaseClient
          .from('creators')
          .update({ stripe_product_id: productId })
          .eq('id', creatorId);
      }

      // Créer le prix
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(creatorData.subscription_price * 100),
        currency: creatorData.currency.toLowerCase(),
        recurring: {
          interval: 'month',
        },
        metadata: {
          creator_id: creatorId,
        },
      });
      priceId = price.id;
      logStep("New price created", { priceId, amount: price.unit_amount });
      
      // Sauvegarder le price_id
      await supabaseClient
        .from('creators')
        .update({ stripe_price_id: priceId })
        .eq('id', creatorId);
      logStep("Price ID saved to database");
    } else {
      logStep("Using existing price ID", { priceId });
    }

    // Créer la session de checkout en mode embedded avec Stripe Tax
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      ui_mode: "embedded",
      return_url: `${req.headers.get("origin")}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      // Activer Stripe Tax pour le calcul automatique des taxes
      automatic_tax: { enabled: true },
      // Générer automatiquement des factures pour les abonnements
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            creator_id: creatorId,
          },
        },
      },
      metadata: {
        creator_id: creatorId,
        user_id: user.id,
      },
    });

    logStep("Embedded checkout session created", { sessionId: session.id, clientSecret: session.client_secret });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-creator-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});