/**
 * Supprime un replay de R2 et de la base de données
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.600.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-REPLAY] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
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
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    const body = await req.json();
    const { replayId, replayType } = body; // replayType: 'public' ou 'private'

    if (!replayId) {
      return new Response(
        JSON.stringify({ error: 'replayId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Delete request", { userId, replayId, replayType });

    // Récupérer le créateur
    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!creator) {
      return new Response(
        JSON.stringify({ error: 'Creator not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fileUrl: string | null = null;
    let filePath: string | null = null;

    if (replayType === 'private') {
      // Replay privé - table private_live_replays
      const { data: replay, error: replayError } = await supabaseAdmin
        .from('private_live_replays')
        .select('file_path, creator_id')
        .eq('id', replayId)
        .single();

      if (replayError || !replay) {
        return new Response(
          JSON.stringify({ error: 'Replay not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier que c'est bien le créateur propriétaire
      if (replay.creator_id !== creator.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      filePath = replay.file_path;

      // Supprimer de la base de données
      const { error: deleteError } = await supabaseAdmin
        .from('private_live_replays')
        .delete()
        .eq('id', replayId);

      if (deleteError) {
        logStep("Database delete error", { error: deleteError.message });
        throw deleteError;
      }

    } else {
      // Replay public - table live_streams
      const { data: liveStream, error: liveError } = await supabaseAdmin
        .from('live_streams')
        .select('recording_url, creator_id')
        .eq('id', replayId)
        .single();

      if (liveError || !liveStream) {
        return new Response(
          JSON.stringify({ error: 'Replay not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier que c'est bien le créateur propriétaire
      if (liveStream.creator_id !== creator.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      fileUrl = liveStream.recording_url;

      // Mettre à null l'URL dans la base
      const { error: updateError } = await supabaseAdmin
        .from('live_streams')
        .update({ recording_url: null })
        .eq('id', replayId);

      if (updateError) {
        logStep("Database update error", { error: updateError.message });
        throw updateError;
      }
    }

    // Supprimer le fichier de R2
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME');

    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });

      let fileKey = '';

      if (filePath) {
        // Pour les replays privés, on a directement le path
        fileKey = filePath;
      } else if (fileUrl) {
        // Pour les replays publics, extraire le path de l'URL
        const r2PublicDomain = Deno.env.get('R2_PUBLIC_DOMAIN') || '';
        
        if (r2PublicDomain && fileUrl.includes(r2PublicDomain)) {
          const urlPath = new URL(fileUrl).pathname;
          fileKey = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
        } else if (fileUrl.includes('r2.cloudflarestorage.com')) {
          const urlPath = new URL(fileUrl).pathname;
          const pathParts = urlPath.split('/').filter(p => p);
          fileKey = pathParts.slice(1).join('/');
        }
      }

      if (fileKey) {
        logStep("Deleting from R2", { fileKey });
        
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: r2BucketName,
            Key: fileKey,
          }));
          logStep("R2 file deleted successfully", { fileKey });
        } catch (r2Error: any) {
          // Log mais ne pas échouer - le fichier DB est déjà supprimé
          logStep("R2 delete warning", { error: r2Error.message });
        }
      }
    } else {
      logStep("R2 credentials not configured, skipping file deletion");
    }

    logStep("Replay deleted successfully", { replayId });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
