import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log('send-otp: Requête reçue');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('send-otp: Code généré pour', user.email, ':', code);

    // Supprimer les anciens codes non vérifiés
    await supabaseAdmin
      .from('otp_codes')
      .delete()
      .eq('user_id', user.id)
      .eq('verified', false);

    // Insérer le nouveau code
    const { error: insertError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        user_id: user.id,
        email: user.email,
        code: code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('send-otp: Erreur insertion OTP:', insertError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la génération du code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('send-otp: Code enregistré avec succès');

    // NOTE: Le SMTP Supabase par défaut ne supporte pas l'envoi de codes personnalisés
    // Le code est retourné au frontend pour affichage (mode dev/test)
    // En production, configurer Resend ou un autre service email
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Code généré',
      code: code
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
