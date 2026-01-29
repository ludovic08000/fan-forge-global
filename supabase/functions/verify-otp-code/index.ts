import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SÉCURITÉ: Même fonction de hachage que dans send-otp
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + Deno.env.get('OTP_HASH_SALT') || 'otp-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// SÉCURITÉ: Comparaison en temps constant pour éviter les attaques timing
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Toujours effectuer la comparaison pour éviter les différences de timing
    let dummy = 0;
    for (let i = 0; i < a.length; i++) {
      dummy |= a.charCodeAt(i) ^ b.charCodeAt(i % b.length);
    }
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
