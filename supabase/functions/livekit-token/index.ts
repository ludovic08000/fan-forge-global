import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.6.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[LiveKit Token] Request received:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[LiveKit Token] CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Utiliser le service role pour pouvoir accéder aux données du live stream
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[LiveKit Token] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      console.error('[LiveKit Token] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = userData.user;
    console.log('[LiveKit Token] User authenticated:', user.id);

    const body = await req.json();
    console.log('[LiveKit Token] Request body:', JSON.stringify(body));
    
    const { roomName, participantName, isPublisher, streamId } = body;

    if (!roomName || !participantName) {
      console.error('[LiveKit Token] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'roomName and participantName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extraire le streamId depuis roomName si non fourni
    const liveStreamId = streamId || roomName.replace('live-', '');

    // Vérifier l'accès au live stream
    if (!isPublisher) {
      // Pour les viewers, vérifier has_live_access avec le service role
      const { data: hasAccess, error: accessError } = await supabaseAdmin
        .rpc('has_live_access', {
          _subscriber_id: user.id,
          _live_stream_id: liveStreamId
        });

      if (accessError) {
        console.error('[LiveKit Token] Access check error:', accessError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify access' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!hasAccess) {
        console.error('[LiveKit Token] Access denied for user:', user.id, 'to stream:', liveStreamId);
        return new Response(
          JSON.stringify({ error: 'Access denied - subscription or payment required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[LiveKit Token] Access verified for viewer:', user.id);
    } else {
      // Pour les publishers, vérifier qu'ils sont le créateur du live avec le service role
      const { data: stream, error: streamError } = await supabaseAdmin
        .from('live_streams')
        .select('creator_id, creators!inner(user_id)')
        .eq('id', liveStreamId)
        .single();

      if (streamError || !stream) {
        console.error('[LiveKit Token] Stream not found:', liveStreamId);
        return new Response(
          JSON.stringify({ error: 'Live stream not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const creatorUserId = (stream.creators as any)?.user_id;
      if (creatorUserId !== user.id) {
        console.error('[LiveKit Token] User is not the creator:', user.id, 'vs', creatorUserId);
        return new Response(
          JSON.stringify({ error: 'Only the creator can broadcast' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[LiveKit Token] Creator verified for broadcast:', user.id);
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    console.log('[LiveKit Token] Config check - apiKey:', !!apiKey, 'apiSecret:', !!apiSecret, 'url:', livekitUrl);

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('[LiveKit Token] Missing LiveKit configuration');
      return new Response(
        JSON.stringify({ error: 'LiveKit configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[LiveKit Token] Generating token for:', { roomName, participantName, isPublisher });

    // Create access token
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: 3600 * 2, // 2 hours (reduced from 6 for security)
    });

    // Grant permissions based on role
    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isPublisher === true,
      canSubscribe: true,
      canPublishData: isPublisher === true, // Only publishers can send data
    });

    const jwt = await accessToken.toJwt();

    console.log('[LiveKit Token] Token generated successfully for room:', roomName, 'publisher:', isPublisher);

    return new Response(
      JSON.stringify({ 
        token: jwt,
        url: livekitUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[LiveKit Token] Error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
