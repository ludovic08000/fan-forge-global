import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CALCULATE-TAX] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Récupérer les paramètres du body
    let body: any = {};
    try {
      const text = await req.text();
      logStep("Request body raw", { text: text.substring(0, 200) });
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      logStep("Failed to parse body", { error: String(e) });
    }
    
    const { amount, country, state, currency = "eur" } = body;
    
    logStep("Parsed parameters", { amount, country, state, currency });
    
    if (!amount || !country) {
      throw new Error(`Missing required parameters: amount=${amount}, country=${country}`);
    }

    logStep("Calculating tax", { amount, country, state, currency });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Construire l'adresse pour Stripe Tax
    const customerAddress: any = {
      country: country.toUpperCase(),
    };

    // Ajouter le state pour les US
    if (country.toUpperCase() === "US" && state) {
      customerAddress.state = state.toUpperCase();
    }

    // Utiliser l'API Tax Calculations de Stripe
    const taxCalculation = await stripe.tax.calculations.create({
      currency: currency.toLowerCase(),
      line_items: [
        {
          amount: Math.round(amount * 100), // Stripe utilise les centimes
          reference: "creator_revenue",
          tax_behavior: "exclusive",
          tax_code: "txcd_10000000", // Code générique pour services numériques
        },
      ],
      customer_details: {
        address: customerAddress,
        address_source: "billing",
      },
    });

    logStep("Tax calculation result", {
      taxAmountExclusive: taxCalculation.tax_amount_exclusive,
      taxBreakdown: taxCalculation.tax_breakdown,
    });

    // Extraire les informations de taxe
    const taxAmount = taxCalculation.tax_amount_exclusive / 100; // Convertir en euros/dollars
    const taxBreakdown = taxCalculation.tax_breakdown || [];
    
    // Calculer le taux effectif
    let effectiveRate = 0;
    let taxType = "VAT";
    let jurisdiction = country;

    if (taxBreakdown.length > 0) {
      const breakdown = taxBreakdown[0];
      if (breakdown.tax_rate_details) {
        effectiveRate = breakdown.tax_rate_details.percentage_decimal;
        taxType = breakdown.tax_rate_details.tax_type || "vat";
        jurisdiction = breakdown.jurisdiction?.display_name || country;
      }
    }

    // Fallback: calculer le taux à partir du montant si non disponible
    if (effectiveRate === 0 && amount > 0) {
      effectiveRate = taxAmount / amount;
    }

    const result = {
      success: true,
      taxAmount,
      taxRate: effectiveRate,
      taxType: taxType.toUpperCase(),
      jurisdiction,
      currency: currency.toUpperCase(),
      amountBeforeTax: amount,
      amountAfterTax: amount - taxAmount,
      stripeCalculationId: taxCalculation.id,
    };

    logStep("Returning result", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
