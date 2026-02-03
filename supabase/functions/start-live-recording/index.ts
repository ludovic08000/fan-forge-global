import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "npm:livekit-server-sdk@2.6.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

serve(async (req) => {
  console.log('[Start Live Recording] Request received:', req.method);
  
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

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

    // Vérifier que l'utilisateur est bien le créateur du live
    const { data: stream, error: streamError } = await supabaseAdmin
      .from('live_streams')
      .select('id, creator_id, enable_recording, title, creators!inner(user_id)')
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
        JSON.stringify({ error: 'Only the creator can start recording' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stream.enable_recording) {
      return new Response(
        JSON.stringify({ error: 'Recording is not enabled for this stream' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configuration LiveKit
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !apiKey || !apiSecret) {
      console.error('[Start Live Recording] Missing LiveKit configuration');
      return new Response(
        JSON.stringify({ error: 'LiveKit configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configuration R2
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME');

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
      console.error('[Start Live Recording] Missing R2 configuration');
      return new Response(
        JSON.stringify({ error: 'R2 storage configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer le client Egress - utiliser l'URL HTTP au lieu de WSS
    const httpUrl = livekitUrl.replace('wss://', 'https://');
    const egressClient = new EgressClient(httpUrl, apiKey, apiSecret);
    
    const roomName = `live-${streamId}`;
    const timestamp = Date.now();
    const filePath = `replays/${stream.creator_id}/${streamId}_${timestamp}.mp4`;

    console.log('[Start Live Recording] Starting room composite egress for room:', roomName);
    console.log('[Start Live Recording] Output file:', filePath);
    console.log('[Start Live Recording] R2 bucket:', r2BucketName);
    console.log('[Start Live Recording] R2 endpoint:', `https://${r2AccountId}.r2.cloudflarestorage.com`);

    // Créer la configuration S3 pour R2 avec les classes SDK v2
    const s3Config = new S3Upload({
      accessKey: r2AccessKeyId,
      secret: r2SecretAccessKey,
      bucket: r2BucketName,
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
    });

    // Créer l'output fichier avec les classes SDK v2
    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: filePath,
      disableManifest: true,
      output: {
        case: 's3',
        value: s3Config,
      },
    });

    // Démarrer l'enregistrement avec Room Composite Egress vers R2
    // Utiliser layout 'grid' au lieu de 'speaker' pour éviter l'écran noir quand il n'y a qu'un broadcaster
    const egressInfo = await egressClient.startRoomCompositeEgress(
      roomName,
      { file: fileOutput },
      {
        layout: 'grid',
        audioOnly: false,
        videoOnly: false,
      }
    );

    console.log('[Start Live Recording] Egress started:', egressInfo.egressId);

    // Sauvegarder l'egress ID et le chemin du fichier dans la base de données
    await supabaseAdmin
      .from('live_streams')
      .update({ 
        egress_id: egressInfo.egressId,
        recording_started_at: new Date().toISOString()
      })
      .eq('id', streamId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        egressId: egressInfo.egressId,
        message: 'Enregistrement démarré'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Start Live Recording] Error:', error.message, error.stack);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
