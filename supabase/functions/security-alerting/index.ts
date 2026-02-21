import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { verifyCronSecret } from "../_shared/auth.ts";

/**
 * Security Alerting Edge Function
 * 
 * SECURITY: Requires x-cron-secret header (no fallback).
 * Analyzes security_access_logs + rate_limit_logs for anomalies.
 */

const logStep = (step: string, details?: any) => {
  console.log(`[security-alerting] ${step}`, details ? JSON.stringify(details) : '');
};

// Thresholds
const PROXY_SPIKE_THRESHOLD = 100;
const RATE_LIMIT_SPIKE_THRESHOLD = 20;
const UPLOAD_SPIKE_THRESHOLD = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    // SECURITY: Strictly require CRON_SECRET - no fallback
    if (!verifyCronSecret(req)) {
      console.warn("[security-alerting] Unauthorized access attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const alerts: Array<{
      alert_type: string;
      severity: string;
      user_id: string | null;
      ip_address: string | null;
      details: Record<string, any>;
      metric_value: number;
      threshold: number;
    }> = [];

    // 1. Check proxy access spikes
    logStep('Checking proxy access spikes');
    const { data: rawLogs } = await supabaseAdmin
      .from('security_access_logs')
      .select('user_id, ip_address')
      .gte('created_at', tenMinutesAgo);

    if (rawLogs) {
      const userCounts = new Map<string, { count: number; ip: string }>();
      for (const log of rawLogs) {
        const key = log.user_id || log.ip_address || 'unknown';
        const existing = userCounts.get(key) || { count: 0, ip: log.ip_address || '' };
        existing.count++;
        userCounts.set(key, existing);
      }

      for (const [key, data] of userCounts) {
        if (data.count >= PROXY_SPIKE_THRESHOLD) {
          alerts.push({
            alert_type: 'proxy_access_spike',
            severity: data.count >= PROXY_SPIKE_THRESHOLD * 3 ? 'critical' : 'warning',
            user_id: key.includes('-') ? key : null,
            ip_address: data.ip || null,
            details: { endpoint: 'proxy-r2-video/proxy-r2-image', window_minutes: 10 },
            metric_value: data.count,
            threshold: PROXY_SPIKE_THRESHOLD,
          });
        }
      }
    }

    // 2. Check rate limit breaches
    logStep('Checking rate limit breaches');
    const { data: rateLimitLogs } = await supabaseAdmin
      .from('rate_limit_logs')
      .select('user_id, ip_address, endpoint')
      .gte('created_at', tenMinutesAgo);

    if (rateLimitLogs) {
      const userRLCounts = new Map<string, { count: number; ip: string; endpoints: Set<string> }>();
      for (const log of rateLimitLogs) {
        const key = log.user_id || log.ip_address || 'unknown';
        const existing = userRLCounts.get(key) || { count: 0, ip: log.ip_address || '', endpoints: new Set() };
        existing.count++;
        if (log.endpoint) existing.endpoints.add(log.endpoint);
        userRLCounts.set(key, existing);
      }

      for (const [key, data] of userRLCounts) {
        if (data.count >= RATE_LIMIT_SPIKE_THRESHOLD) {
          alerts.push({
            alert_type: 'rate_limit_breach',
            severity: data.count >= RATE_LIMIT_SPIKE_THRESHOLD * 5 ? 'critical' : 'warning',
            user_id: key.includes('-') ? key : null,
            ip_address: data.ip || null,
            details: { endpoints: Array.from(data.endpoints), window_minutes: 10 },
            metric_value: data.count,
            threshold: RATE_LIMIT_SPIKE_THRESHOLD,
          });
        }
      }
    }

    // 3. Check upload spikes
    logStep('Checking upload spikes');
    const { data: uploadLogs } = await supabaseAdmin
      .from('security_access_logs')
      .select('user_id, ip_address')
      .eq('endpoint', 'r2-upload-url')
      .gte('created_at', tenMinutesAgo);

    if (uploadLogs) {
      const uploadCounts = new Map<string, { count: number; ip: string }>();
      for (const log of uploadLogs) {
        const key = log.user_id || log.ip_address || 'unknown';
        const existing = uploadCounts.get(key) || { count: 0, ip: log.ip_address || '' };
        existing.count++;
        uploadCounts.set(key, existing);
      }

      for (const [key, data] of uploadCounts) {
        if (data.count >= UPLOAD_SPIKE_THRESHOLD) {
          alerts.push({
            alert_type: 'upload_spike',
            severity: data.count >= UPLOAD_SPIKE_THRESHOLD * 3 ? 'critical' : 'warning',
            user_id: key.includes('-') ? key : null,
            ip_address: data.ip || null,
            details: { window_minutes: 10 },
            metric_value: data.count,
            threshold: UPLOAD_SPIKE_THRESHOLD,
          });
        }
      }
    }

    // Store alerts
    if (alerts.length > 0) {
      logStep('Inserting alerts', { count: alerts.length });
      await supabaseAdmin.from('security_alerts').insert(alerts);

      // Admin notifications for critical alerts
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        const { data: admins } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        if (admins) {
          const notifications = admins.flatMap(admin =>
            criticalAlerts.map(alert => ({
              user_id: admin.user_id,
              type: 'security_alert',
              title: '🚨 Alerte sécurité critique',
              message: `${alert.alert_type}: ${alert.metric_value} requêtes (seuil: ${alert.threshold})`,
              data: { alert_type: alert.alert_type, user_id: alert.user_id, ip: alert.ip_address },
            }))
          );
          await supabaseAdmin.from('notifications').insert(notifications).catch(() => {});
        }
      }
    }

    logStep('Alerting complete', { alertsGenerated: alerts.length });

    return new Response(
      JSON.stringify({ success: true, alertsGenerated: alerts.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[security-alerting] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
