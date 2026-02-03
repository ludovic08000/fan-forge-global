import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.600.0";
import { verifyCronSecret } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // SECURITY: Verify cron secret - reject unauthorized requests
    if (!verifyCronSecret(req)) {
      console.error("[Cleanup Replays] Unauthorized: Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find replays older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('[Cleanup Replays] Looking for replays older than:', sevenDaysAgo);

    const { data: expiredReplays, error: fetchError } = await supabaseAdmin
      .from('content')
      .select('id, file_url, creator_id, title')
      .contains('tags', ['replay'])
      .lt('created_at', sevenDaysAgo);

    if (fetchError) {
      console.error('[Cleanup Replays] Error fetching expired replays:', fetchError);
      throw fetchError;
    }

    if (!expiredReplays || expiredReplays.length === 0) {
      console.log('[Cleanup Replays] No expired replays found');
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'No expired replays found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cleanup Replays] Found ${expiredReplays.length} expired replay(s)`);

    // Configure S3 client for R2
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME');

    let s3Client: S3Client | null = null;
    
    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
      s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
    } else {
      console.warn('[Cleanup Replays] R2 credentials not configured, will only delete from database');
    }

    const deletedIds: string[] = [];
    const errors: string[] = [];

    for (const replay of expiredReplays) {
      try {
        // Delete file from R2 if configured
        if (s3Client && replay.file_url) {
          const r2PublicDomain = Deno.env.get('R2_PUBLIC_DOMAIN') || '';
          let fileKey = '';
          
          if (r2PublicDomain && replay.file_url.includes(r2PublicDomain)) {
            const urlPath = new URL(replay.file_url).pathname;
            fileKey = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
          } else if (replay.file_url.includes('r2.cloudflarestorage.com')) {
            const urlPath = new URL(replay.file_url).pathname;
            const pathParts = urlPath.split('/').filter(p => p);
            fileKey = pathParts.slice(1).join('/');
          }

          if (fileKey) {
            console.log(`[Cleanup Replays] Deleting R2 file: ${fileKey}`);
            
            await s3Client.send(new DeleteObjectCommand({
              Bucket: r2BucketName,
              Key: fileKey,
            }));
            
            console.log(`[Cleanup Replays] Deleted R2 file: ${fileKey}`);
          }
        }

        // Delete from database
        const { error: deleteError } = await supabaseAdmin
          .from('content')
          .delete()
          .eq('id', replay.id);

        if (deleteError) {
          console.error(`[Cleanup Replays] Error deleting replay ${replay.id}:`, deleteError);
          errors.push(`${replay.id}: ${deleteError.message}`);
        } else {
          deletedIds.push(replay.id);
          console.log(`[Cleanup Replays] Deleted replay: ${replay.id} - ${replay.title}`);
        }

        // Clean recording URL from live_streams
        await supabaseAdmin
          .from('live_streams')
          .update({ recording_url: null })
          .eq('recording_url', replay.file_url);

      } catch (fileError) {
        console.error(`[Cleanup Replays] Error processing replay ${replay.id}:`, fileError);
        errors.push(`${replay.id}: ${fileError.message}`);
      }
    }

    console.log(`[Cleanup Replays] Cleanup complete. Deleted: ${deletedIds.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: deletedIds.length,
        deletedIds,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Cleanup Replays] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
