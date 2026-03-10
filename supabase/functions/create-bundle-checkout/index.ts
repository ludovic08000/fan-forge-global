// v2 - CORS redeploy for theforge.fans
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user?.email) throw new Error("Non authentifié");

    const { bundleId } = await req.json();
    if (!bundleId) throw new Error("bundleId requis");

    // Fetch bundle
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: bundle, error: bundleError } = await supabaseAdmin
      .from('content_bundles')
      .select('*, creators!inner(stripe_account_id, user_id, platform_commission_rate)')
      .eq('id', bundleId)
      .eq('status', 'active')
      .single();

    if (bundleError || !bundle) throw new Error("Bundle introuvable ou inactif");

    // Check sold out
    if (bundle.max_sales && bundle.sales_count >= bundle.max_sales) {
      throw new Error("Ce bundle est épuisé");
    }

    // Check not already purchased
    const { data: existing } = await supabaseAdmin
      .from('bundle_purchases')
      .select('id')
      .eq('bundle_id', bundleId)
      .eq('buyer_id', user.id)
      .eq('status', 'paid')
      .maybeSingle();

    if (existing) throw new Error("Vous avez déjà acheté ce bundle");

    const stripeAccountId = (bundle as any).creators?.stripe_account_id;
    if (!stripeAccountId) throw new Error("Créateur non configuré pour les paiements");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-01-27.acacia",
    });

    const commissionRate = (bundle as any).creators?.platform_commission_rate || 15;
    const amountCents = Math.round(bundle.bundle_price * 100);
    const platformFee = Math.round(amountCents * commissionRate / 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: bundle.currency.toLowerCase(),
          product_data: {
            name: `Bundle: ${bundle.title}`,
            description: bundle.description || `Pack de contenus à prix réduit`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: stripeAccountId },
        metadata: {
          bundle_id: bundleId,
          buyer_id: user.id,
          type: 'bundle_purchase',
        },
      },
      metadata: {
        bundle_id: bundleId,
        buyer_id: user.id,
        type: 'bundle_purchase',
      },
      success_url: `${req.headers.get("origin")}/subscriptions?bundle_success=true`,
      cancel_url: `${req.headers.get("origin")}/?bundle_cancelled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
