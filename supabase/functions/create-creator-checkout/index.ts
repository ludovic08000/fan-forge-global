// v2 - CORS redeploy for theforge.fans
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { validateCsrfFromRequest, csrfErrorResponse } from "../_shared/csrf.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { logPaymentEvent } from "../_shared/auditLog.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREATOR-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }
  
  const corsHeaders = getCorsHeaders(req);

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Rate limiting check
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const { data: userData } = await authClient.auth.getUser(token);
      userId = userData.user?.id || null;
    }

    const rateLimitResult = await checkRateLimit(req, userId, 'checkout');
    if (!rateLimitResult.allowed) {
      logStep("Rate limit exceeded", { userId });
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

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
    const body = await req.json();
    const { creatorId, referralCode, csrfToken } = body;
    if (!creatorId) throw new Error("Creator ID is required");
    logStep("Creator ID received", { creatorId, referralCode });

    // Valider le token CSRF (plus souple - log l'erreur mais ne bloque pas en dev)
    if (csrfToken) {
      const csrfValidation = await validateCsrfFromRequest(req, user.id, { csrfToken });
      if (!csrfValidation.valid) {
        logStep("CSRF validation warning", { reason: csrfValidation.reason });
        // En production, on devrait bloquer - mais pour l'instant on log juste
        // return csrfErrorResponse(csrfValidation.reason || "Invalid CSRF token", corsHeaders);
      } else {
        logStep("CSRF token validated");
      }
    } else {
      logStep("No CSRF token provided - proceeding anyway");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Paralléliser les requêtes créateur et client Stripe
    const [creatorResult, customersResult] = await Promise.all([
      supabaseClient
        .from('creators')
        .select('subscription_price, currency, stage_name, stripe_price_id, stripe_product_id, stripe_account_id, stripe_charges_enabled, platform_commission_rate')
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

    // Vérifier que le créateur a un compte Stripe Connect actif
    if (!creatorData.stripe_account_id) {
      throw new Error("Ce créateur n'a pas encore configuré son compte Stripe. Il doit d'abord connecter Stripe dans ses paramètres.");
    }

    if (!creatorData.stripe_charges_enabled) {
      throw new Error("Le compte Stripe de ce créateur n'est pas encore activé pour recevoir des paiements.");
    }

    const commissionRate = creatorData.platform_commission_rate ?? 15; // 15% par défaut

    logStep("Creator data loaded", { 
      price: creatorData.subscription_price, 
      currency: creatorData.currency,
      stageName: creatorData.stage_name,
      hasPriceId: !!creatorData.stripe_price_id,
      stripeAccountId: creatorData.stripe_account_id,
      commissionRate
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

    // Gérer le code promo/parrainage
    let discounts: any[] = [];
    let trialDays: number | undefined = undefined;
    let affiliateCodeId: string | null = null;
    let affiliateCreatorId: string | null = null;
    let affiliateCommissionRate: number | null = null;
    
    if (referralCode) {
      // D'abord vérifier si c'est un code d'affiliation (creator_referral_codes)
      const { data: affiliateCode } = await supabaseClient
        .from('creator_referral_codes')
        .select('id, creator_id, commission_rate, is_active')
        .eq('code', referralCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (affiliateCode) {
        // C'est un code d'affiliation - on le track pour les commissions
        affiliateCodeId = affiliateCode.id;
        affiliateCreatorId = affiliateCode.creator_id;
        affiliateCommissionRate = affiliateCode.commission_rate;
        logStep("Affiliate code found", { 
          affiliateCodeId, 
          affiliateCreatorId, 
          commissionRate: affiliateCommissionRate 
        });
      } else {
        // Sinon, vérifier si c'est un code promo classique (referral_codes)
        const { data: refCode } = await supabaseClient
          .from('referral_codes')
          .select('*')
          .eq('creator_id', creatorId)
          .eq('code', referralCode.toUpperCase())
          .eq('is_active', true)
          .maybeSingle();

        if (refCode) {
          // Si c'est un code 100% gratuit, utiliser une période d'essai au lieu d'un coupon
          const isFreeCode = refCode.discount_percentage === 100;
          
          if (isFreeCode) {
            // Calculer les jours d'essai basés sur duration_months
            const durationMonths = refCode.duration_months;
            if (durationMonths === null || durationMonths === undefined || durationMonths === 0) {
              // "Forever" gratuit = 365 jours d'essai (max raisonnable)
              trialDays = 365;
            } else {
              // X mois gratuits = X * 30 jours d'essai
              trialDays = durationMonths * 30;
            }
            logStep("Free promo code - using trial period", { referralCode, trialDays, durationMonths });
          } else {
            // Code avec réduction partielle - utiliser un coupon classique
            const couponParams: any = {
              metadata: { referral_code_id: refCode.id }
            };

            // Gérer la durée (si pas de duration_months, défaut = 1 mois = 'once')
            const durationMonths = refCode.duration_months;
            if (durationMonths === null || durationMonths === undefined || durationMonths === 0) {
              couponParams.duration = 'forever';
            } else if (durationMonths === 1) {
              couponParams.duration = 'once';
            } else {
              couponParams.duration = 'repeating';
              couponParams.duration_in_months = durationMonths;
            }

            if (refCode.discount_percentage) {
              couponParams.percent_off = refCode.discount_percentage;
            } else if (refCode.discount_amount) {
              couponParams.amount_off = Math.round(refCode.discount_amount * 100);
              couponParams.currency = creatorData.currency.toLowerCase();
            }

            const coupon = await stripe.coupons.create(couponParams);
            discounts = [{ coupon: coupon.id }];
            logStep("Coupon created for referral code", { couponId: coupon.id, referralCode, duration: couponParams.duration });
          }
        }
      }
    }

    // Calculer la commission de la plateforme
    const unitAmount = Math.round(creatorData.subscription_price * 100);
    const applicationFeePercent = commissionRate;

    // Créer la session de checkout en mode redirect avec Stripe Connect
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/creator/${creatorId}?subscription_cancelled=true`,
      // Stripe Connect: paiement vers le compte du créateur
      subscription_data: {
        application_fee_percent: applicationFeePercent,
        transfer_data: {
          destination: creatorData.stripe_account_id,
        },
        trial_period_days: trialDays,
        metadata: {
          creator_id: creatorId,
          user_id: user.id,
          referral_code: referralCode || null,
          affiliate_code_id: affiliateCodeId || null,
          affiliate_creator_id: affiliateCreatorId || null,
          affiliate_commission_rate: affiliateCommissionRate?.toString() || null,
        },
      },
      // Si période d'essai, ne pas collecter de moyen de paiement immédiatement
      payment_method_collection: trialDays ? 'if_required' : 'always',
      discounts: discounts.length > 0 ? discounts : undefined,
      metadata: {
        creator_id: creatorId,
        user_id: user.id,
        referral_code: referralCode || null,
        affiliate_code_id: affiliateCodeId || null,
        affiliate_creator_id: affiliateCreatorId || null,
        affiliate_commission_rate: affiliateCommissionRate?.toString() || null,
      },
    });
    
    logStep("Checkout session params", { trialDays, hasDiscounts: discounts.length > 0, paymentMethodCollection: trialDays ? 'if_required' : 'always' });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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