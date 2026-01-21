import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EgressClient } from "npm:livekit-server-sdk@2.6.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Stop Live Recording] Request received:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    const body = await req.json();
    const { streamId } = body;

    if (!streamId) {
      return new Response(
        JSON.stringify({ error: 'streamId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le stream avec l'egress ID
    const { data: stream, error: streamError } = await supabaseAdmin
      .from('live_streams')
      .select('id, creator_id, egress_id, creators!inner(user_id)')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      return new Response(
        JSON.stringify({ error: 'Live stream not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creatorUserId = (stream.creators as any)?.user_id;
    if (creatorUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Only the creator can stop recording' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stream.egress_id) {
      return new Response(
        JSON.stringify({ error: 'No active recording found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configuration LiveKit
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'LiveKit configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer le client Egress et arrêter l'enregistrement (utiliser HTTPS)
    const httpUrl = livekitUrl.replace('wss://', 'https://');
    const egressClient = new EgressClient(httpUrl, apiKey, apiSecret);
    
    console.log('[Stop Live Recording] Stopping egress:', stream.egress_id);

    await egressClient.stopEgress(stream.egress_id);

    // Mettre à jour la DB pour indiquer que l'arrêt a été demandé
    await supabaseAdmin
      .from('live_streams')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', streamId);

    console.log('[Stop Live Recording] Egress stopped successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enregistrement arrêté - le fichier sera disponible dans quelques instants'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Stop Live Recording] Error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
