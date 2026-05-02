import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// SÉCURITÉ: Même fonction de hachage que dans send-otp
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get('OTP_HASH_SALT') || 'otp-salt-v1';
  const data = encoder.encode(code + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// SÉCURITÉ: Comparaison en temps constant pour éviter les attaques timing
function timingSafeEqual(a: string, b: string): boolean {
  let result = 0;
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return result === 0 && a.length === b.length;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return new Response(JSON.stringify({ error: 'Code invalide' }), {
        status: 400,
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
      console.error('Erreur auth:', userError);
      return new Response(JSON.stringify({ error: 'Utilisateur non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer le code OTP le plus récent non vérifié
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      console.log('Aucun code valide trouvé pour:', user.id);
      return new Response(JSON.stringify({ error: 'Code expiré ou inexistant. Demandez un nouveau code.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier les tentatives (max 5)
    if (otpRecord.attempts >= 5) {
      // Supprimer le code après trop de tentatives
      await supabaseAdmin
        .from('otp_codes')
        .delete()
        .eq('id', otpRecord.id);

      return new Response(JSON.stringify({ error: 'Trop de tentatives. Demandez un nouveau code.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Incrémenter les tentatives AVANT la vérification
    await supabaseAdmin
      .from('otp_codes')
      .update({ attempts: otpRecord.attempts + 1 })
      .eq('id', otpRecord.id);

    // SÉCURITÉ: Hasher le code fourni et comparer avec le hash stocké
    const hashedInputCode = await hashCode(code);
    
    // SÉCURITÉ: Comparaison en temps constant
    if (!timingSafeEqual(otpRecord.code, hashedInputCode)) {
      const remaining = 4 - otpRecord.attempts;
      return new Response(JSON.stringify({ 
        error: `Code incorrect. ${remaining} tentative(s) restante(s).` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Code correct - marquer comme vérifié
    await supabaseAdmin
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    // Mettre à jour le profil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ otp_verified: true })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Erreur mise à jour profil:', profileError);
    }

    console.log('OTP vérifié avec succès pour:', user.email);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Code vérifié avec succès' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur verify-otp-code:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
