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
        .select('id, creator_id, title, is_premium, price')
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
        // Duration et size peuvent être des BigInt (strings), on les convertit en Number
        const duration = fileResult.duration ? Math.floor(Number(fileResult.duration) / 1000000000) : null; // nanoseconds to seconds
        const fileSize = fileResult.size ? Number(fileResult.size) : null;
        
        // Le fichier a été enregistré directement dans R2 via S3Upload
        // On récupère le filepath pour construire l'URL publique
        const filepath = fileResult.filename || '';
        
        console.log('[LiveKit Recording Webhook] Recording completed:', {
          filepath,
          duration,
          fileSize
        });

        // SECURITY: Store only the file PATH, not a public URL
        // Signed URLs will be generated on-demand via get-replay-url
        // This prevents public access to premium replay content
        
        // Extract only the file path from the location or filename
        let r2FilePath = filepath;
        
        // If filepath is empty, try to extract from location
        if (!r2FilePath && fileResult.location) {
          try {
            const locationUrl = new URL(fileResult.location);
            // Remove bucket name from path (first segment)
            const pathParts = locationUrl.pathname.split('/').filter(p => p);
            // If first part is bucket name, skip it
            r2FilePath = pathParts.slice(1).join('/');
          } catch {
            r2FilePath = fileResult.location;
          }
        }
        
        console.log('[LiveKit Recording Webhook] Storing file path (NOT public URL):', r2FilePath);

        if (r2FilePath) {
          // Vérifier si le replay n'a pas déjà été créé (éviter les doublons)
          const { data: existingContent } = await supabaseAdmin
            .from('content')
            .select('id')
            .eq('file_url', r2FilePath)
            .limit(1);

          if (existingContent && existingContent.length > 0) {
            console.log('[LiveKit Recording Webhook] Replay already exists, skipping creation');
            return new Response(
              JSON.stringify({ success: true, message: 'Replay already processed' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // SECURITY: Store ONLY the file path - no public URLs
          // Frontend must use get-replay-url edge function to get signed URLs
          await supabaseAdmin
            .from('live_streams')
            .update({ 
              recording_url: r2FilePath, // PATH ONLY, not public URL
              recording_completed_at: new Date().toISOString()
            })
            .eq('id', stream.id);

          // Vérifier si c'est un live privé (lié à une demande de live privé)
          const { data: privateRequest } = await supabaseAdmin
            .from('private_live_requests')
            .select('id, price, currency, proposed_duration')
            .eq('live_stream_id', stream.id)
            .eq('status', 'paid')
            .maybeSingle();

          if (privateRequest) {
            // C'est un live privé - créer un replay vendable
            console.log('[LiveKit Recording Webhook] Creating private live replay for sale');
            
            // Vérifier qu'un replay n'existe pas déjà
            const { data: existingReplay } = await supabaseAdmin
              .from('private_live_replays')
              .select('id')
              .eq('private_live_request_id', privateRequest.id)
              .maybeSingle();

            if (!existingReplay) {
              await supabaseAdmin
                .from('private_live_replays')
                .insert({
                  creator_id: stream.creator_id,
                  private_live_request_id: privateRequest.id,
                  live_stream_id: stream.id,
                  title: `Replay: ${stream.title}`,
                  description: `Replay de live privé - ${privateRequest.proposed_duration || 20} minutes`,
                  file_path: r2FilePath,
                  duration: duration,
                  file_size: fileSize,
                  original_price: privateRequest.price,
                  replay_price: privateRequest.price, // Même prix par défaut
                  currency: privateRequest.currency || 'EUR',
                  is_available: true
                });
              console.log('[LiveKit Recording Webhook] Private live replay created for sale at', privateRequest.price, '€');
            }
          } else {
            // Live standard (public) - NE PAS créer dans content
            // Les replays restent uniquement dans live_streams.recording_url
            // Ils sont accessibles via la section "Mes replays" du créateur
            console.log('[LiveKit Recording Webhook] Public live replay saved to live_streams.recording_url only (not in content table)');
          }
        } else {
          console.error('[LiveKit Recording Webhook] No file path available from recording');
          await supabaseAdmin
            .from('live_streams')
            .update({ 
              recording_error: 'No file path available for recording',
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
