import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-PROCESS-PAYMENTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Starting automatic payment processing");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all creators with Stripe Connect configured
    const { data: creators, error: creatorsError } = await supabaseAdmin
      .from('creators')
      .select('id, user_id, currency, stripe_account_id')
      .eq('stripe_onboarding_completed', true)
      .eq('stripe_charges_enabled', true)
      .eq('stripe_payouts_enabled', true);

    if (creatorsError) throw creatorsError;
    logStep("Found creators with Stripe Connect", { count: creators?.length || 0 });

    if (!creators || creators.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No creators ready for payment",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results = [];
    const now = new Date();
    const periodEnd = now.toISOString();
    // First day of current month
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    for (const creator of creators) {
      try {
        logStep(`Processing creator ${creator.id}`);

        // Calculate revenue with commission
        const { data: revenueData, error: revenueError } = await supabaseAdmin
          .rpc('calculate_creator_revenue_with_commission', {
            creator_uuid: creator.id,
            start_date: periodStart,
            end_date: periodEnd
          });

        if (revenueError) {
          logStep(`Error calculating revenue for ${creator.id}`, revenueError);
          results.push({ creator_id: creator.id, success: false, error: revenueError.message });
          continue;
        }

        const revenue = revenueData[0];
        const amountAfterCommission = revenue.total_after_commission;

        // Skip if no earnings or below minimum threshold (50€)
        if (!amountAfterCommission || amountAfterCommission < 50) {
          logStep(`Skipping creator ${creator.id} - amount too low`, { amount: amountAfterCommission });
          results.push({ 
            creator_id: creator.id, 
            success: true, 
            skipped: true, 
            reason: 'below_minimum',
            amount: amountAfterCommission 
          });
          continue;
        }

        // Create payment request
        const { data: paymentRequest, error: requestError } = await supabaseAdmin
          .from('creator_payment_requests')
          .insert({
            creator_id: creator.id,
            amount: amountAfterCommission,
            currency: creator.currency || 'EUR',
            period_start: periodStart,
            period_end: periodEnd,
            status: 'pending',
            requested_at: now.toISOString()
          })
          .select()
          .single();

        if (requestError) {
          logStep(`Error creating payment request for ${creator.id}`, requestError);
          results.push({ creator_id: creator.id, success: false, error: requestError.message });
          continue;
        }

        logStep(`Created payment request for ${creator.id}`, { request_id: paymentRequest.id, amount: amountAfterCommission });

        // Process the payment via Stripe
        try {
          const amountInCents = Math.round(amountAfterCommission * 100);
          
          const transfer = await stripe.transfers.create({
            amount: amountInCents,
            currency: (creator.currency || 'EUR').toLowerCase(),
            destination: creator.stripe_account_id,
            description: `Paiement créateur - Période ${periodStart} à ${periodEnd}`,
            metadata: {
              payment_request_id: paymentRequest.id,
              creator_id: creator.id,
              period_start: periodStart,
              period_end: periodEnd
            }
          });

          logStep(`Stripe transfer created for ${creator.id}`, { transfer_id: transfer.id });

          // Update payment request status
          await supabaseAdmin
            .from('creator_payment_requests')
            .update({
              status: 'completed',
              processed_at: now.toISOString(),
              stripe_transfer_id: transfer.id
            })
            .eq('id', paymentRequest.id);

          // Record platform commission
          await supabaseAdmin
            .from('platform_commissions')
            .insert({
              creator_id: creator.id,
              payment_request_id: paymentRequest.id,
              period_start: periodStart,
              period_end: periodEnd,
              total_revenue: revenue.total_before_commission,
              subscription_revenue: revenue.subscription_revenue,
              tips_revenue: revenue.tips_revenue,
              live_revenue: revenue.live_revenue,
              private_content_revenue: revenue.private_content_revenue,
              commission_rate: 0.15,
              commission_amount: revenue.commission_amount,
              creator_payout: amountAfterCommission,
              currency: creator.currency || 'EUR'
            });

          logStep(`Payment completed for ${creator.id}`, { 
            transfer_id: transfer.id, 
            amount: amountAfterCommission,
            commission: revenue.commission_amount 
          });

          results.push({ 
            creator_id: creator.id, 
            success: true, 
            amount: amountAfterCommission,
            transfer_id: transfer.id,
            commission: revenue.commission_amount
          });

        } catch (stripeError) {
          logStep(`Stripe error for ${creator.id}`, stripeError);
          
          // Update payment request as failed
          await supabaseAdmin
            .from('creator_payment_requests')
            .update({
              status: 'failed',
              error_message: stripeError.message
            })
            .eq('id', paymentRequest.id);

          results.push({ 
            creator_id: creator.id, 
            success: false, 
            error: stripeError.message 
          });
        }

      } catch (error) {
        logStep(`Error processing creator ${creator.id}`, error);
        results.push({ 
          creator_id: creator.id, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failedCount = results.filter(r => !r.success).length;

    logStep("Payment processing completed", { 
      total: creators.length,
      successful: successCount,
      skipped: skippedCount,
      failed: failedCount 
    });

    return new Response(JSON.stringify({ 
      success: true,
      processed: creators.length,
      successful: successCount,
      skipped: skippedCount,
      failed: failedCount,
      period: { start: periodStart, end: periodEnd },
      results
    }), {
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
