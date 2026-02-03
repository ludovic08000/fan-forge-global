import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Configuration sécurité
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 3;
const TOKEN_EXPIRY_MINUTES = 30;
const ARTIFICIAL_DELAY_MS = 500; // Délai constant pour prévenir timing attacks

// Message identique dans tous les cas - ne révèle JAMAIS l'existence d'un compte
const GENERIC_SUCCESS_MESSAGE = "Si cette adresse email est associée à un compte, vous recevrez un email avec les instructions.";

// Génère un token sécurisé
async function generateSecureToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Comparaison à temps constant pour éviter timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Même si les longueurs diffèrent, on fait une comparaison factice
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Délai artificiel constant
async function artificialDelay(): Promise<void> {
  const startTime = Date.now();
  // Ajouter un peu de variance pour ne pas être trop prévisible
  const variance = Math.random() * 100;
  const targetDelay = ARTIFICIAL_DELAY_MS + variance;
  
  // Attendre le temps restant après le traitement
  const elapsed = Date.now() - startTime;
  if (elapsed < targetDelay) {
    await new Promise(resolve => setTimeout(resolve, targetDelay - elapsed));
  }
}

// Validation email basique
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

// Vérification Turnstile (anti-bot)
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not configured - skipping verification');
    return true;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: ip,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { action, email, turnstileToken } = await req.json();
    
    // Validation basique
    if (!action || !email) {
      await artificialDelay();
      return new Response(JSON.stringify({ 
        success: true, 
        message: GENERIC_SUCCESS_MESSAGE 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normaliser l'email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Validation format email
    if (!isValidEmail(normalizedEmail)) {
      await artificialDelay();
      return new Response(JSON.stringify({ 
        success: true, 
        message: GENERIC_SUCCESS_MESSAGE 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown';

    // Vérification anti-bot (Turnstile)
    if (turnstileToken) {
      const isHuman = await verifyTurnstile(turnstileToken, ip);
      if (!isHuman) {
        console.log('Turnstile verification failed for IP:', ip);
        await artificialDelay();
        return new Response(JSON.stringify({ 
          success: true, 
          message: GENERIC_SUCCESS_MESSAGE 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Rate limiting par email ET par IP
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    
    const { count: emailCount } = await supabaseAdmin
      .from('email_action_logs')
      .select('*', { count: 'exact', head: true })
      .eq('email_hash', await hashEmail(normalizedEmail))
      .eq('action', action)
      .gte('created_at', windowStart);

    const { count: ipCount } = await supabaseAdmin
      .from('email_action_logs')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('action', action)
      .gte('created_at', windowStart);

    // Si rate limited, on retourne quand même le message générique
    if ((emailCount || 0) >= MAX_REQUESTS_PER_WINDOW || (ipCount || 0) >= MAX_REQUESTS_PER_WINDOW * 2) {
      console.log(`Rate limited: email_count=${emailCount}, ip_count=${ipCount}`);
      await artificialDelay();
      return new Response(JSON.stringify({ 
        success: true, 
        message: GENERIC_SUCCESS_MESSAGE 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Logger la tentative (avec hash de l'email pour privacy)
    await supabaseAdmin
      .from('email_action_logs')
      .insert({
        email_hash: await hashEmail(normalizedEmail),
        ip_address: ip,
        action,
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

    // Vérifier si l'utilisateur existe (silencieusement)
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = users?.users?.some(u => 
      constantTimeCompare(u.email?.toLowerCase() || '', normalizedEmail)
    );

    // Traiter selon l'action
    if (action === 'password_reset') {
      if (userExists) {
        // Générer un token sécurisé
        const token = await generateSecureToken();
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

        // Stocker le token
        await supabaseAdmin
          .from('secure_email_tokens')
          .insert({
            email_hash: await hashEmail(normalizedEmail),
            token_hash: await hashToken(token),
            action,
            expires_at: expiresAt.toISOString(),
          });

        // Envoyer l'email via Supabase Auth (qui gère son propre email)
        await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${req.headers.get('origin') || 'https://fan-forge-global.lovable.app'}/reset-password`,
        });

        console.log(`Password reset email sent to existing user`);
      } else {
        // Utilisateur n'existe pas - ne rien faire mais simuler le même temps
        console.log(`Password reset requested for non-existent email`);
      }
    } else if (action === 'verify_email') {
      if (userExists) {
        // Renvoyer l'email de vérification
        const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
        const user = userData?.users?.find(u => 
          constantTimeCompare(u.email?.toLowerCase() || '', normalizedEmail)
        );
        
        if (user && !user.email_confirmed_at) {
          await supabaseAdmin.auth.resend({
            type: 'signup',
            email: normalizedEmail,
          });
        }
      }
    }

    // Appliquer le délai artificiel pour avoir un temps de réponse constant
    const elapsed = Date.now() - startTime;
    const remainingDelay = Math.max(0, ARTIFICIAL_DELAY_MS - elapsed + Math.random() * 100);
    await new Promise(resolve => setTimeout(resolve, remainingDelay));

    return new Response(JSON.stringify({ 
      success: true, 
      message: GENERIC_SUCCESS_MESSAGE 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Secure email action error:', error);
    const corsHeaders = getCorsHeaders(req);
    
    // Même en cas d'erreur, retourner le message générique
    await artificialDelay();
    return new Response(JSON.stringify({ 
      success: true, 
      message: GENERIC_SUCCESS_MESSAGE 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Hash l'email pour le stockage (privacy)
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 16) || ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash le token pour le stockage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
