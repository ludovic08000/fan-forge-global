import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user?.email) throw new Error("Non authentifié");

    const { wishlistId, amount } = await req.json();
    if (!wishlistId || !amount || amount <= 0) throw new Error("Paramètres invalides");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: wishlist, error } = await supabaseAdmin
      .from('creator_wishlists')
      .select('*, creators!inner(stripe_account_id, platform_commission_rate)')
      .eq('id', wishlistId)
      .eq('status', 'active')
      .single();

    if (error || !wishlist) throw new Error("Projet introuvable ou inactif");

    const stripeAccountId = (wishlist as any).creators?.stripe_account_id;
    if (!stripeAccountId) throw new Error("Créateur non configuré pour les paiements");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-01-27.acacia" });

    const commissionRate = (wishlist as any).creators?.platform_commission_rate || 15;
    const amountCents = Math.round(amount * 100);
    const platformFee = Math.round(amountCents * commissionRate / 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: wishlist.currency.toLowerCase(),
          product_data: { name: `Contribution: ${wishlist.title}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: stripeAccountId },
        metadata: { wishlist_id: wishlistId, contributor_id: user.id, type: 'wishlist_contribution' },
      },
      metadata: { wishlist_id: wishlistId, contributor_id: user.id, type: 'wishlist_contribution', amount: String(amount) },
      success_url: `${req.headers.get("origin")}/?wishlist_success=true`,
      cancel_url: `${req.headers.get("origin")}/?wishlist_cancelled=true`,
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
