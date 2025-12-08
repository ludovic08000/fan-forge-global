import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[GET-SIGNED-URL] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting signed URL generation');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client avec service role pour accéder au storage
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Client pour vérifier l'utilisateur
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep('No auth header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logStep('User authentication failed', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('User authenticated', { userId: user.id });

    const { filePath, bucket, contentId } = await req.json();

    if (!filePath || !bucket) {
      return new Response(
        JSON.stringify({ error: 'filePath and bucket are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Request params', { filePath, bucket, contentId });

    // Si c'est un contenu premium, vérifier l'accès
    if (contentId) {
      // Récupérer les infos du contenu
      const { data: content, error: contentError } = await supabaseAdmin
        .from('content')
        .select('creator_id, is_premium, is_preview')
        .eq('id', contentId)
        .single();

      if (contentError || !content) {
        logStep('Content not found', contentError);
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si le contenu est premium et n'est pas un preview, vérifier l'abonnement
      if (content.is_premium && !content.is_preview) {
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', user.id)
          .eq('creator_id', content.creator_id)
          .eq('status', 'active')
          .maybeSingle();

        // Vérifier aussi si l'utilisateur est le créateur
        const { data: creator } = await supabaseAdmin
          .from('creators')
          .select('user_id')
          .eq('id', content.creator_id)
          .single();

        const isCreator = creator?.user_id === user.id;
        const isAdmin = await checkIsAdmin(supabaseAdmin, user.id);

        if (!subscription && !isCreator && !isAdmin) {
          logStep('Access denied - no subscription', { userId: user.id, creatorId: content.creator_id });
          return new Response(
            JSON.stringify({ error: 'Subscription required to access this content' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        logStep('Access granted', { isSubscribed: !!subscription, isCreator, isAdmin });
      }
    }

    // Générer l'URL signée avec expiration (1 heure)
    const expiresIn = 3600; // 1 heure en secondes
    
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (signedUrlError) {
      logStep('Failed to create signed URL', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Signed URL generated successfully', { expiresIn });

    return new Response(
      JSON.stringify({ 
        signedUrl: signedUrlData.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logStep('Error', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Vérifier si l'utilisateur est admin
 */
async function checkIsAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}
