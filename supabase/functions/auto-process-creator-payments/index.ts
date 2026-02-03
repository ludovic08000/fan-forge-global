import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-PROCESS-PAYMENTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }
  
  const corsHeaders = getCorsHeaders(req);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Starting automatic payment processing");

    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: Missing authorization header");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Authentication required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      logStep("ERROR: Invalid authentication token", { error: authError?.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid authentication token" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { user_id: user.id });

    // ===== ADMIN ROLE CHECK =====
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc('is_admin', { _user_id: user.id });

    if (roleError || !isAdmin) {
      logStep("ERROR: User is not an admin", { user_id: user.id, error: roleError?.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Admin access required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin access verified", { user_id: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ===== IDEMPOTENCY CHECK =====
    // Check if there's already a payment request for this period
    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: existingRequests, error: existingError } = await supabaseAdmin
      .from('creator_payment_requests')
      .select('id, creator_id, status')
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd)
      .in('status', ['pending', 'processing', 'completed']);

    if (existingError) {
      logStep("Error checking existing requests", existingError);
    }

    const processedCreatorIds = new Set((existingRequests || []).map(r => r.creator_id));
    if (processedCreatorIds.size > 0) {
      logStep("Found existing payment requests for this period", { 
        count: processedCreatorIds.size,
        creator_ids: Array.from(processedCreatorIds)
      });
    }

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

    for (const creator of creators) {
      try {
        // ===== IDEMPOTENCY: Skip already processed creators =====
        if (processedCreatorIds.has(creator.id)) {
          logStep(`Skipping creator ${creator.id} - already has payment request for this period`);
          results.push({ 
            creator_id: creator.id, 
            success: true, 
            skipped: true, 
            reason: 'already_processed'
          });
          continue;
        }

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
            status: 'processing',
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

        // Process the payment via Stripe with idempotency key
        try {
          const amountInCents = Math.round(amountAfterCommission * 100);
          const idempotencyKey = `auto-payment-${creator.id}-${periodStart}-${periodEnd}`;
          
          const transfer = await stripe.transfers.create({
            amount: amountInCents,
            currency: (creator.currency || 'EUR').toLowerCase(),
            destination: creator.stripe_account_id,
            description: `Paiement créateur - Période ${periodStart} à ${periodEnd}`,
            metadata: {
              payment_request_id: paymentRequest.id,
              creator_id: creator.id,
              period_start: periodStart,
              period_end: periodEnd,
              triggered_by: user.id
            }
          }, {
            idempotencyKey: idempotencyKey
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
      failed: failedCount,
      triggered_by: user.id
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
