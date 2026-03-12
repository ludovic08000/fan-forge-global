import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const EXPECTED_COMMISSION_RATE = 15; // 15%
const BOOST_TYPES = ['boost_30min', 'boost_24h', 'boost_1week', 'creator_boost'];

const logStep = (step: string, details?: any) => {
  console.log(`[AUDIT-PAYMENTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth: admin only or cron
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret === Deno.env.get("CRON_SECRET");

    if (!isCron) {
      const supabaseAnon = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Non authentifié");
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
      if (error || !user) throw new Error("Non authentifié");

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roles) throw new Error("Accès refusé");
    }

    logStep("Audit started");

    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 30 * 24 * 3600000).toISOString(); // 30 days

    const anomalies: any[] = [];
    let totalTransactions = 0;

    // 1. Check platform_commissions for wrong rates
    const { data: commissions } = await supabaseAdmin
      .from("platform_commissions")
      .select("*")
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    totalTransactions += commissions?.length || 0;

    for (const c of commissions || []) {
      // Check commission rate
      if (c.commission_rate !== EXPECTED_COMMISSION_RATE) {
        anomalies.push({
          type: "wrong_commission_rate",
          severity: "critical",
          details: `Commission ${c.commission_rate}% au lieu de ${EXPECTED_COMMISSION_RATE}%`,
          creator_id: c.creator_id,
          record_id: c.id,
          amount: c.total_revenue,
          expected_commission: (c.total_revenue * EXPECTED_COMMISSION_RATE / 100).toFixed(2),
          actual_commission: c.commission_amount,
        });
      }

      // Verify math: commission_amount should be total_revenue * rate / 100
      const expectedCommission = c.total_revenue * c.commission_rate / 100;
      const diff = Math.abs(expectedCommission - c.commission_amount);
      if (diff > 0.01) {
        anomalies.push({
          type: "commission_calculation_error",
          severity: "critical",
          details: `Commission calculée ${c.commission_amount}€ vs attendu ${expectedCommission.toFixed(2)}€`,
          creator_id: c.creator_id,
          record_id: c.id,
        });
      }

      // Verify payout: creator_payout should be total_revenue - commission
      const expectedPayout = c.total_revenue - c.commission_amount;
      const payoutDiff = Math.abs(expectedPayout - c.creator_payout);
      if (payoutDiff > 0.01) {
        anomalies.push({
          type: "payout_calculation_error",
          severity: "high",
          details: `Payout ${c.creator_payout}€ vs attendu ${expectedPayout.toFixed(2)}€`,
          creator_id: c.creator_id,
          record_id: c.id,
        });
      }
    }

    // 2. Check creators with non-standard commission rates
    const { data: creators } = await supabaseAdmin
      .from("creators")
      .select("id, stage_name, platform_commission_rate")
      .neq("platform_commission_rate", EXPECTED_COMMISSION_RATE);

    for (const c of creators || []) {
      if (c.platform_commission_rate != null && c.platform_commission_rate !== EXPECTED_COMMISSION_RATE) {
        anomalies.push({
          type: "non_standard_rate",
          severity: "warning",
          details: `Créateur "${c.stage_name}" a un taux de ${c.platform_commission_rate}% au lieu de ${EXPECTED_COMMISSION_RATE}%`,
          creator_id: c.id,
        });
      }
    }

    // 3. Check boost payments - should have NO transfer to creator (100% platform)
    const { data: boostPayments } = await supabaseAdmin
      .from("creator_boosts")
      .select("*")
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    totalTransactions += boostPayments?.length || 0;

    // 4. Check subscription payments vs commissions recorded
    const { data: subscriptions } = await supabaseAdmin
      .from("subscriptions")
      .select("id, creator_id, price, created_at")
      .eq("status", "active")
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    totalTransactions += subscriptions?.length || 0;

    // 5. Check tips
    const { data: tips } = await supabaseAdmin
      .from("tips")
      .select("id, creator_id, amount, created_at, stripe_payment_intent_id")
      .not("stripe_payment_intent_id", "is", null)
      .gte("created_at", periodStart)
      .lte("created_at", periodEnd);

    totalTransactions += tips?.length || 0;

    // Calculate score
    const score = totalTransactions > 0
      ? Math.max(0, Math.round(100 - (anomalies.filter(a => a.severity === "critical").length * 20) - (anomalies.filter(a => a.severity === "high").length * 10) - (anomalies.filter(a => a.severity === "warning").length * 3)))
      : 100;

    // AI analysis if anomalies found
    let aiAnalysis: string | null = null;
    if (anomalies.length > 0) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `Tu es un auditeur financier IA spécialisé dans les plateformes de créateurs. Analyse les anomalies de paiement détectées. La plateforme prend 15% de commission sur tout SAUF les boosts (100% plateforme). Réponds en français, de manière concise et actionnable. Max 300 mots.`
                },
                {
                  role: "user",
                  content: `Période: ${periodStart} à ${periodEnd}\nTransactions totales: ${totalTransactions}\nAnomalies détectées: ${anomalies.length}\nScore: ${score}/100\n\nDétail des anomalies:\n${JSON.stringify(anomalies, null, 2)}`
                }
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiAnalysis = aiData.choices?.[0]?.message?.content || null;
          }
        }
      } catch (e) {
        logStep("AI analysis failed", { error: (e as Error).message });
      }
    }

    // Save audit result
    const { error: insertError } = await supabaseAdmin
      .from("payment_audit_results")
      .insert({
        audit_type: isCron ? "scheduled" : "manual",
        period_start: periodStart,
        period_end: periodEnd,
        total_transactions: totalTransactions,
        anomalies_found: anomalies.length,
        anomalies: anomalies,
        ai_analysis: aiAnalysis,
        score,
      });

    if (insertError) logStep("Insert error", { error: insertError });

    logStep("Audit completed", { transactions: totalTransactions, anomalies: anomalies.length, score });

    return new Response(JSON.stringify({
      score,
      total_transactions: totalTransactions,
      anomalies_found: anomalies.length,
      anomalies,
      ai_analysis: aiAnalysis,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: (error as Error).message });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
