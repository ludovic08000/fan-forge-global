import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// SÉCURITÉ: Hasher le code OTP avec SHA-256 avant stockage
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get('OTP_HASH_SALT') || 'otp-salt-v1';
  const data = encoder.encode(code + salt);
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

    if (!user.email) {
      return new Response(JSON.stringify({ error: 'Email utilisateur introuvable' }), {
        status: 400,
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

    // Générer un code à 6 chiffres avec crypto.getRandomValues
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
    const { data: insertedOtp, error: insertError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        user_id: user.id,
        email: user.email,
        code: hashedCode,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('send-otp: Erreur insertion OTP:', insertError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la génération du code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('send-otp: Code enregistré (hashé), envoi email via transactional...');

    // Envoyer l'email via le système transactionnel (notify.theforge.fans)
    const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'otp-code',
        recipientEmail: user.email,
        templateData: { code },
      },
    });

    if (emailError || emailData?.success === false || emailData?.queued !== true) {
      console.error('send-otp: Erreur envoi email transactionnel:', emailError || emailData);
      if (insertedOtp?.id) {
        await supabaseAdmin
          .from('otp_codes')
          .delete()
          .eq('id', insertedOtp.id);
      }

      return new Response(JSON.stringify({
        success: false,
        error: "Impossible d'envoyer l'email de vérification. Réessayez dans quelques instants.",
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('send-otp: Email transactionnel envoyé avec succès');
    
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
