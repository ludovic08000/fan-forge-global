import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Action: Vérifier si bloqué
    if (action === "check") {
      // Vérifier le blocage par identifiant
      const { data: blockByIdentifier } = await supabaseClient
        .from('security_blocks')
        .select('*')
        .eq('identifier', identifier)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      // Vérifier le blocage par IP
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

      // Compter les tentatives récentes
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

    // Action: Enregistrer une tentative
    if (action === "record") {
      // Enregistrer la tentative
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

      // Si échec, vérifier si on doit bloquer
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
          
          // Bloquer l'identifiant
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

          // Bloquer aussi l'IP
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

      // Succès - réinitialiser le compteur
      return new Response(JSON.stringify({ 
        blocked: false,
        success: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Débloquer manuellement (admin only)
    if (action === "unblock") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (!user) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Vérifier si admin
      const { data: adminRole } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        return new Response(JSON.stringify({ error: "Accès refusé" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Débloquer
      await supabaseClient
        .from('security_blocks')
        .update({ is_active: false })
        .eq('identifier', identifier);

      logStep('Account unblocked by admin', { identifier, adminId: user.id });

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
    // Fail open - ne pas bloquer en cas d'erreur
    return new Response(JSON.stringify({ 
      blocked: false,
      error: "Erreur interne"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
