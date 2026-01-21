import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyInternalSecret, validateJwtAndGetUserId } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 30;
const TIME_WINDOW_MINUTES = 15;

const logStep = (step: string, details?: any) => {
  console.log(`[BRUTE-FORCE] ${step}`, details ? JSON.stringify(details) : '');
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
    const { action, identifier, success, attemptType } = await req.json();
    
    const ipAddress = req.headers.get("x-forwarded-for") || 
                      req.headers.get("x-real-ip") || 
                      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    logStep('Request received', { action, identifier, ipAddress, attemptType });

    // Action: Check if blocked (read-only, safe to allow)
    if (action === "check") {
      // Check block by identifier
      const { data: blockByIdentifier } = await supabaseClient
        .from('security_blocks')
        .select('*')
        .eq('identifier', identifier)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      // Check block by IP
      const { data: blockByIp } = await supabaseClient
        .from('security_blocks')
        .select('*')
        .eq('identifier', ipAddress)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (blockByIdentifier || blockByIp) {
        const block = blockByIdentifier || blockByIp;
        const expiresAt = new Date(block.expires_at);
        const remainingMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / 60000);
        
        logStep('Access blocked', { identifier, ipAddress, remainingMinutes });
        
        return new Response(JSON.stringify({ 
          blocked: true,
          reason: block.reason,
          expiresAt: block.expires_at,
          remainingMinutes
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Count recent attempts
      const timeWindowStart = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000).toISOString();
      
      const { count: attemptCount } = await supabaseClient
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .or(`identifier.eq.${identifier},ip_address.eq.${ipAddress}`)
        .eq('success', false)
        .gte('created_at', timeWindowStart);

      const remainingAttempts = MAX_ATTEMPTS - (attemptCount || 0);

      return new Response(JSON.stringify({ 
        blocked: false,
        attemptCount: attemptCount || 0,
        remainingAttempts: Math.max(0, remainingAttempts),
        maxAttempts: MAX_ATTEMPTS
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Action "record" REQUIRES internal secret (server-to-server only)
    // This prevents attackers from calling this endpoint to trigger blocks
    if (action === "record") {
      if (!verifyInternalSecret(req)) {
        logStep('Record action rejected - no internal secret', { identifier, ipAddress });
        return new Response(JSON.stringify({ 
          error: "Unauthorized - internal calls only"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Record the attempt
      await supabaseClient
        .from('login_attempts')
        .insert({
          identifier,
          ip_address: ipAddress,
          user_agent: userAgent,
          attempt_type: attemptType || 'login',
          success: success || false
        });

      logStep('Attempt recorded', { identifier, ipAddress, success });

      // If failure, check if we need to block
      if (!success) {
        const timeWindowStart = new Date(Date.now() - TIME_WINDOW_MINUTES * 60 * 1000).toISOString();
        
        const { count: failedCount } = await supabaseClient
          .from('login_attempts')
          .select('*', { count: 'exact', head: true })
          .or(`identifier.eq.${identifier},ip_address.eq.${ipAddress}`)
          .eq('success', false)
          .gte('created_at', timeWindowStart);

        if ((failedCount || 0) >= MAX_ATTEMPTS) {
          const expiresAt = new Date(Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000).toISOString();
          
          // Block identifier
          await supabaseClient
            .from('security_blocks')
            .upsert({
              identifier,
              block_type: 'brute_force',
              reason: `Trop de tentatives échouées (${failedCount})`,
              expires_at: expiresAt,
              is_active: true,
              blocked_at: new Date().toISOString()
            }, { 
              onConflict: 'identifier,block_type' 
            });

          // Block IP too
          await supabaseClient
            .from('security_blocks')
            .upsert({
              identifier: ipAddress,
              block_type: 'brute_force',
              reason: `IP bloquée suite à tentatives multiples`,
              expires_at: expiresAt,
              is_active: true,
              blocked_at: new Date().toISOString()
            }, { 
              onConflict: 'identifier,block_type' 
            });

          logStep('Account blocked', { identifier, ipAddress, failedCount });

          return new Response(JSON.stringify({ 
            blocked: true,
            reason: `Compte temporairement bloqué suite à ${failedCount} tentatives échouées`,
            expiresAt,
            remainingMinutes: BLOCK_DURATION_MINUTES
          }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const remainingAttempts = MAX_ATTEMPTS - (failedCount || 0);
        
        return new Response(JSON.stringify({ 
          blocked: false,
          attemptCount: failedCount,
          remainingAttempts: Math.max(0, remainingAttempts),
          warning: remainingAttempts <= 2 ? `Attention: ${remainingAttempts} tentative(s) restante(s)` : null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success - reset counter
      return new Response(JSON.stringify({ 
        blocked: false,
        success: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Manual unblock (admin only)
    if (action === "unblock") {
      // SECURITY: Proper JWT validation for admin unblock
      const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
      
      if (authResult.error) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.statusCode,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = authResult.userId!;

      // Verify admin role
      const { data: adminRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Accès refusé" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Unblock
      await supabaseClient
        .from('security_blocks')
        .update({ is_active: false })
        .eq('identifier', identifier);

      logStep('Account unblocked by admin', { identifier, adminId: userId });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep('Error', error);
    // SECURITY: Fail closed on error - return blocked=true to prevent bypass
    return new Response(JSON.stringify({ 
      blocked: true,
      error: "Erreur interne - veuillez réessayer"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
