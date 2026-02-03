import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// SÉCURITÉ: Hasher le code OTP avec SHA-256 avant stockage
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + Deno.env.get('OTP_HASH_SALT') || 'otp-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  console.log('send-otp: Requête reçue');
  
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }
  
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('send-otp: Pas de header Authorization');
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('send-otp: Erreur auth:', userError);
      return new Response(JSON.stringify({ error: 'Utilisateur non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('send-otp: Utilisateur authentifié:', user.email);

    // Vérifier le rate limiting (max 3 codes par 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', fiveMinutesAgo);

    if (count && count >= 3) {
      console.log('send-otp: Rate limit atteint pour:', user.email);
      return new Response(JSON.stringify({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Générer un code à 6 chiffres avec crypto.getRandomValues pour plus de sécurité
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const code = String(100000 + (randomBuffer[0] % 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('send-otp: Code généré pour', user.email);

    // SÉCURITÉ: Hasher le code avant stockage en base
    const hashedCode = await hashCode(code);

    // Supprimer les anciens codes non vérifiés
    await supabaseAdmin
      .from('otp_codes')
      .delete()
      .eq('user_id', user.id)
      .eq('verified', false);

    // Insérer le nouveau code HASHÉ
    const { error: insertError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        user_id: user.id,
        email: user.email,
        code: hashedCode, // Stockage du HASH, pas du code en clair
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('send-otp: Erreur insertion OTP:', insertError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la génération du code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('send-otp: Code enregistré (hashé), envoi email...');

    // Envoyer l'email via Resend avec le code EN CLAIR
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Sécurité <onboarding@resend.dev>',
      to: [user.email!],
      subject: 'Votre code de vérification',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #333; margin: 0 0 20px; font-size: 24px; text-align: center;">
              🔐 Code de vérification
            </h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5; text-align: center;">
              Voici votre code de vérification à usage unique :
            </p>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: white; font-family: monospace;">
                ${code}
              </span>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Ce code expire dans 10 minutes.<br>
              Si vous n'avez pas demandé ce code, ignorez cet email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('send-otp: Erreur envoi email:', emailError);
      // En dev, on peut retourner le code - EN PRODUCTION, NE JAMAIS FAIRE ÇA
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Code généré (email non envoyé - mode dev)',
        // ATTENTION: Ne pas exposer le code en production
        emailError: emailError.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('send-otp: Email envoyé avec succès:', emailData);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Code envoyé par email'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-otp: Erreur:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
