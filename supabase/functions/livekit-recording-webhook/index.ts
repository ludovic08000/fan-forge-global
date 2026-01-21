import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { WebhookReceiver } from "npm:livekit-server-sdk@2.6.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.600.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[LiveKit Recording Webhook] Request received:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      console.error('[LiveKit Recording Webhook] Missing LiveKit credentials');
      return new Response(
        JSON.stringify({ error: 'Configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier la signature du webhook LiveKit
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const body = await req.text();
    const authHeader = req.headers.get('Authorization') || '';
    
    let event;
    try {
      event = await receiver.receive(body, authHeader);
    } catch (e) {
      console.error('[LiveKit Recording Webhook] Invalid signature:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[LiveKit Recording Webhook] Event type:', event.event);

    // On s'intéresse aux événements d'egress
    if (event.event === 'egress_ended' && event.egressInfo) {
      const egressInfo = event.egressInfo;
      console.log('[LiveKit Recording Webhook] Egress ended:', egressInfo.egressId, 'Status:', egressInfo.status);

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Trouver le live stream associé à cet egress
      const { data: stream, error: streamError } = await supabaseAdmin
        .from('live_streams')
        .select('id, creator_id, title')
        .eq('egress_id', egressInfo.egressId)
        .single();

      if (streamError || !stream) {
        console.error('[LiveKit Recording Webhook] Stream not found for egress:', egressInfo.egressId);
        return new Response(
          JSON.stringify({ error: 'Stream not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier si l'enregistrement a réussi
      // Status: EGRESS_COMPLETE = 3
      if (egressInfo.status === 3 && egressInfo.fileResults?.length > 0) {
        const fileResult = egressInfo.fileResults[0];
        const downloadUrl = fileResult.downloadUrl || fileResult.filename;
        const duration = fileResult.duration ? Math.floor(fileResult.duration / 1000000000) : null; // nanoseconds to seconds
        const fileSize = fileResult.size || null;

        console.log('[LiveKit Recording Webhook] Recording completed:', {
          downloadUrl,
          duration,
          fileSize
        });

        // Si on a une URL de téléchargement depuis LiveKit Cloud
        if (downloadUrl) {
          // Télécharger le fichier depuis LiveKit et l'uploader vers Cloudflare R2
          try {
            console.log('[LiveKit Recording Webhook] Downloading from LiveKit:', downloadUrl);
            
            const response = await fetch(downloadUrl);
            if (!response.ok) {
              throw new Error(`Failed to download: ${response.status}`);
            }
            
            const videoBuffer = await response.arrayBuffer();
            const fileName = `replays/${stream.creator_id}/${stream.id}_${Date.now()}.mp4`;
            
            console.log('[LiveKit Recording Webhook] Uploading to Cloudflare R2:', fileName);
            
            // Configuration R2
            const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
            const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
            const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
            const r2BucketName = Deno.env.get('R2_BUCKET_NAME');
            
            if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
              throw new Error('R2 configuration missing');
            }
            
            // Créer le client S3 pour R2
            const s3Client = new S3Client({
              region: 'auto',
              endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId: r2AccessKeyId,
                secretAccessKey: r2SecretAccessKey,
              },
            });
            
            // Upload vers R2
            await s3Client.send(new PutObjectCommand({
              Bucket: r2BucketName,
              Key: fileName,
              Body: new Uint8Array(videoBuffer),
              ContentType: 'video/mp4',
            }));
            
            // URL publique R2 (via le domaine public du bucket)
            const publicUrl = `https://pub-${r2AccountId}.r2.dev/${fileName}`;
            console.log('[LiveKit Recording Webhook] File uploaded to R2:', publicUrl);

            // Mettre à jour le live stream avec l'URL de l'enregistrement
            await supabaseAdmin
              .from('live_streams')
              .update({ 
                recording_url: publicUrl,
                recording_completed_at: new Date().toISOString()
              })
              .eq('id', stream.id);

            // Créer automatiquement un contenu vidéo dans la galerie du créateur
            const { error: contentError } = await supabaseAdmin
              .from('content')
              .insert({
                creator_id: stream.creator_id,
                title: `Replay: ${stream.title}`,
                file_url: publicUrl,
                content_type: 'video',
                is_premium: true, // Les replays sont premium par défaut
                status: 'published',
                duration: duration,
                file_size: fileSize,
                description: `Enregistrement du live "${stream.title}"`,
                tags: ['replay', 'live']
              });

            if (contentError) {
              console.error('[LiveKit Recording Webhook] Content creation error:', contentError);
            } else {
              console.log('[LiveKit Recording Webhook] Content created successfully for replay');
              
              // Mettre à jour le compteur de contenu du créateur
              await supabaseAdmin.rpc('update_creator_content_count', { 
                _creator_id: stream.creator_id 
              }).catch(() => {
                // La fonction n'existe peut-être pas, ignorer
              });
            }

          } catch (downloadError) {
            console.error('[LiveKit Recording Webhook] Download/upload error:', downloadError);
            
            // Fallback: stocker l'URL LiveKit directement (temporaire)
            await supabaseAdmin
              .from('live_streams')
              .update({ 
                recording_url: downloadUrl,
                recording_error: `R2 upload failed: ${downloadError.message}`,
                recording_completed_at: new Date().toISOString()
              })
              .eq('id', stream.id);
          }
        }
      } else {
        console.log('[LiveKit Recording Webhook] Recording failed or incomplete, status:', egressInfo.status);
        
        // Marquer l'échec
        await supabaseAdmin
          .from('live_streams')
          .update({ 
            recording_error: `Recording failed with status: ${egressInfo.status}`,
            egress_id: null
          })
          .eq('id', stream.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[LiveKit Recording Webhook] Error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
