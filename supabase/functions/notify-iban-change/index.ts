/**
 * Edge Function pour notifier un créateur du changement de son IBAN
 * SECURISE: validation d'entrée, rate limiting, authentification stricte, CSRF
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { validateCsrfFromRequest, csrfErrorResponse } from "../_shared/csrf.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Rate limiting - 5 changements d'IBAN par heure par utilisateur
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 3600000; // 1 heure

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
};

// Validation IBAN basique
const isValidIbanFormat = (iban: string): boolean => {
  if (!iban || typeof iban !== 'string') return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  // IBAN: 15-34 caractères alphanumériques
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleaned);
};

// Validation BIC
const isValidBicFormat = (bic: string): boolean => {
  if (!bic || typeof bic !== 'string') return false;
  const cleaned = bic.replace(/\s/g, '').toUpperCase();
  // BIC: 8 ou 11 caractères
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-IBAN-CHANGE] ${step}${detailsStr}`);
};

interface NotifyIbanChangeRequest {
  oldIban?: string;
  newIban: string;
  oldBic?: string;
  newBic: string;
  csrfToken?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing environment variables");
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("ERROR: Missing authorization header");
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logStep("ERROR: Invalid authentication", { error: authError?.message });
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Rate limiting par utilisateur
    if (!checkRateLimit(user.id)) {
      logStep("Rate limited", { user_id: user.id });
      return new Response(JSON.stringify({ error: 'Too many IBAN changes. Please wait.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    // Parser et valider le body
    let body: NotifyIbanChangeRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Vérification CSRF pour cette action sensible
    const csrfResult = await validateCsrfFromRequest(req, user.id, body);
    if (!csrfResult.valid) {
      logStep("CSRF validation failed", { reason: csrfResult.reason, user_id: user.id });
      return csrfErrorResponse(csrfResult.reason || "Invalid CSRF token", corsHeaders);
    }
    logStep("CSRF token validated", { user_id: user.id });

    const { oldIban, newIban, oldBic, newBic } = body;

    // Validation des nouveaux IBAN/BIC
    if (!newIban || !isValidIbanFormat(newIban)) {
      logStep("Invalid new IBAN format", { user_id: user.id });
      return new Response(JSON.stringify({ error: 'Format IBAN invalide' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!newBic || !isValidBicFormat(newBic)) {
      logStep("Invalid new BIC format", { user_id: user.id });
      return new Response(JSON.stringify({ error: 'Format BIC invalide' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Récupérer les infos du créateur
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('stage_name, user_id')
      .eq('user_id', user.id)
      .single();

    if (creatorError || !creator) {
      logStep("Creator not found", { user_id: user.id });
      return new Response(JSON.stringify({ error: 'Créateur non trouvé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Préparer le message (masquer partiellement l'IBAN pour la sécurité)
    const maskIban = (iban: string | undefined) => {
      if (!iban) return 'Non défini';
      const cleaned = iban.replace(/\s/g, '');
      if (cleaned.length < 8) return '****';
      return cleaned.substring(0, 4) + '****' + cleaned.substring(cleaned.length - 4);
    };

    const changes = [];
    if (oldIban !== newIban) {
      changes.push(`IBAN: ${maskIban(oldIban)} → ${maskIban(newIban)}`);
    }
    if (oldBic !== newBic) {
      changes.push(`BIC: ${oldBic || 'Non défini'} → ${newBic}`);
    }

    const message = `
Vos informations bancaires ont été modifiées :

${changes.join('\n')}

Date de modification : ${new Date().toLocaleString('fr-FR')}

⚠️ Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement le support.
    `.trim();

    // Créer la notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'security_alert',
        title: '🔒 Modification de vos informations bancaires',
        message: message,
        data: {
          change_type: 'iban_update',
          timestamp: new Date().toISOString(),
          // Ne PAS stocker les IBAN complets dans les données de notification
          iban_changed: oldIban !== newIban,
          bic_changed: oldBic !== newBic,
        }
      });

    if (notifError) {
      logStep("Error creating notification", { error: notifError.message });
      throw notifError;
    }

    logStep("IBAN change notification sent", { 
      user_id: user.id, 
      iban_changed: oldIban !== newIban,
      bic_changed: oldBic !== newBic 
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Notification envoyée' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
