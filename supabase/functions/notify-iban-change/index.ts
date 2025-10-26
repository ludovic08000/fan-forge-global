import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyIbanChangeRequest {
  oldIban?: string;
  newIban: string;
  oldBic?: string;
  newBic: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    // Vérifier l'authentification
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Non authentifié');
    }

    const { oldIban, newIban, oldBic, newBic }: NotifyIbanChangeRequest = await req.json();

    // Récupérer les infos du créateur
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('stage_name')
      .eq('user_id', user.id)
      .single();

    if (creatorError) {
      throw new Error('Créateur non trouvé');
    }

    // Préparer le message
    const changes = [];
    if (oldIban !== newIban) {
      changes.push(`IBAN: ${oldIban || 'Non défini'} → ${newIban}`);
    }
    if (oldBic !== newBic) {
      changes.push(`BIC: ${oldBic || 'Non défini'} → ${newBic}`);
    }

    const message = `
Bonjour ${creator.stage_name || user.email},

Nous vous informons que vos informations bancaires ont été modifiées :

${changes.join('\n')}

Date de modification : ${new Date().toLocaleString('fr-FR')}

Si vous n'êtes pas à l'origine de cette modification, veuillez contacter immédiatement le support.

Cordialement,
L'équipe
    `.trim();

    // Envoyer l'email via l'API admin de Supabase
    // Note: Supabase n'a pas d'API directe pour envoyer des emails personnalisés
    // On enregistre plutôt une notification dans la base de données
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'iban_change',
        title: '🔒 Modification de vos informations bancaires',
        message: message,
        data: {
          oldIban: oldIban || null,
          newIban,
          oldBic: oldBic || null,
          newBic,
          timestamp: new Date().toISOString(),
        }
      });

    if (notifError) {
      console.error('Erreur notification:', notifError);
      throw notifError;
    }

    console.log('Notification IBAN changement envoyée pour', user.email);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification envoyée' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});