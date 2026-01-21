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
      console.log('[LiveKit Recording Webhook] Egress ended:', egressInfo.egressId);
      console.log('[LiveKit Recording Webhook] Status:', egressInfo.status);
      console.log('[LiveKit Recording Webhook] File results:', JSON.stringify(egressInfo.fileResults || []));
      console.log('[LiveKit Recording Webhook] Error:', egressInfo.error || 'none');

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
        console.error('[LiveKit Recording Webhook] DB error:', streamError?.message || 'No stream found');
        // Ne pas retourner 404, juste log et continuer
        return new Response(
          JSON.stringify({ success: true, warning: 'Stream not found but webhook processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[LiveKit Recording Webhook] Found stream:', stream.id, 'creator:', stream.creator_id);

      // Vérifier si l'enregistrement a réussi
      // Status: EGRESS_COMPLETE = 3
      if (egressInfo.status === 3 && egressInfo.fileResults?.length > 0) {
        const fileResult = egressInfo.fileResults[0];
        console.log('[LiveKit Recording Webhook] File result:', JSON.stringify(fileResult));
        const duration = fileResult.duration ? Math.floor(fileResult.duration / 1000000000) : null; // nanoseconds to seconds
        const fileSize = fileResult.size || null;
        
        // Le fichier a été enregistré directement dans R2 via S3Upload
        // On récupère le filepath pour construire l'URL publique
        const filepath = fileResult.filename || '';
        
        console.log('[LiveKit Recording Webhook] Recording completed:', {
          filepath,
          duration,
          fileSize
        });

        // Configuration R2 pour construire l'URL publique
        const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
        const r2BucketName = Deno.env.get('R2_BUCKET_NAME');
        
        // Construire l'URL publique R2
        // Format: https://<bucket>.<account_id>.r2.dev/<filepath>
        // ou avec un custom domain si configuré
        let publicUrl = '';
        if (r2AccountId && filepath) {
          // URL publique R2 standard
          publicUrl = `https://pub-${r2AccountId}.r2.dev/${filepath}`;
        } else if (fileResult.downloadUrl) {
          // Fallback sur downloadUrl si disponible
          publicUrl = fileResult.downloadUrl;
        }
        
        console.log('[LiveKit Recording Webhook] Public URL:', publicUrl);

        if (publicUrl) {
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
        } else {
          console.error('[LiveKit Recording Webhook] No public URL available');
          await supabaseAdmin
            .from('live_streams')
            .update({ 
              recording_error: 'No public URL available for recording',
              recording_completed_at: new Date().toISOString()
            })
            .eq('id', stream.id);
        }
      } else {
        // Status: 4 = EGRESS_FAILED, 5 = EGRESS_ABORTED
        const statusMessages: Record<number, string> = {
          1: 'Starting',
          2: 'Active',
          3: 'Completed',
          4: 'Failed',
          5: 'Aborted (live ended too quickly or no media)',
          6: 'Limit reached',
        };
        const statusMessage = statusMessages[egressInfo.status] || `Unknown status ${egressInfo.status}`;
        const errorDetail = egressInfo.error ? `: ${egressInfo.error}` : '';
        
        console.log('[LiveKit Recording Webhook] Recording failed:', statusMessage, errorDetail);
        
        // Marquer l'échec avec détails
        await supabaseAdmin
          .from('live_streams')
          .update({ 
            recording_error: `${statusMessage}${errorDetail}`,
            egress_id: null,
            recording_completed_at: new Date().toISOString()
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
