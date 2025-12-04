import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.6.1";

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
    const body = await req.json();
    console.log('[LiveKit Token] Request body:', JSON.stringify(body));
    
    const { roomName, participantName, isPublisher } = body;

    if (!roomName || !participantName) {
      console.error('[LiveKit Token] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'roomName and participantName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    console.log('[LiveKit Token] Config check - apiKey:', !!apiKey, 'apiSecret:', !!apiSecret, 'url:', livekitUrl);

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('[LiveKit Token] Missing LiveKit configuration - apiKey:', !!apiKey, 'apiSecret:', !!apiSecret, 'url:', !!livekitUrl);
      return new Response(
        JSON.stringify({ error: 'LiveKit configuration missing. Please configure LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[LiveKit Token] Generating token for:', { roomName, participantName, isPublisher });

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: 3600 * 6, // 6 hours
    });

    // Grant permissions based on role
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isPublisher === true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    console.log('[LiveKit Token] Token generated successfully for room:', roomName, 'publisher:', isPublisher);

    return new Response(
      JSON.stringify({ 
        token: jwt,
        url: livekitUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[LiveKit Token] Error generating token:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
