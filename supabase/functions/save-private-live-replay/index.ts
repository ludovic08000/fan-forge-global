/**
 * Edge function appelée quand un live privé se termine pour sauvegarder le replay
 * Crée une entrée dans private_live_replays avec le prix original
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SAVE-PRIVATE-REPLAY] ${step}${detailsStr}`);
};

serve(async (req) => {
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
    const { liveStreamId, privateRequestId } = body;

    if (!liveStreamId || !privateRequestId) {
      return new Response(
        JSON.stringify({ error: 'liveStreamId and privateRequestId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Processing private live replay", { liveStreamId, privateRequestId });

    // Récupérer le live stream avec les infos de recording
    const { data: liveStream, error: liveError } = await supabaseAdmin
      .from('live_streams')
      .select(`
        id, 
        creator_id, 
        title, 
        recording_url, 
        thumbnail_url,
        recording_completed_at,
        started_at,
        ended_at,
        creators!inner(user_id)
      `)
      .eq('id', liveStreamId)
      .single();

    if (liveError || !liveStream) {
      logStep("Live stream not found", { liveStreamId, error: liveError?.message });
      return new Response(
        JSON.stringify({ error: 'Live stream not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que c'est bien le créateur
    const creatorUserId = (liveStream.creators as any)?.user_id;
    if (creatorUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Only the creator can save the replay' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!liveStream.recording_url) {
      logStep("No recording available yet", { liveStreamId });
      return new Response(
        JSON.stringify({ error: 'Recording not yet available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la demande de live privé avec le prix
    const { data: privateRequest, error: requestError } = await supabaseAdmin
      .from('private_live_requests')
      .select('id, price, currency, proposed_duration')
      .eq('id', privateRequestId)
      .single();

    if (requestError || !privateRequest) {
      logStep("Private request not found", { privateRequestId, error: requestError?.message });
      return new Response(
        JSON.stringify({ error: 'Private live request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si un replay existe déjà
    const { data: existingReplay } = await supabaseAdmin
      .from('private_live_replays')
      .select('id')
      .eq('private_live_request_id', privateRequestId)
      .maybeSingle();

    if (existingReplay) {
      logStep("Replay already exists", { replayId: existingReplay.id });
      return new Response(
        JSON.stringify({ success: true, replayId: existingReplay.id, message: 'Replay already saved' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculer la durée si possible
    let duration = null;
    if (liveStream.started_at && liveStream.ended_at) {
      const startTime = new Date(liveStream.started_at).getTime();
      const endTime = new Date(liveStream.ended_at).getTime();
      duration = Math.floor((endTime - startTime) / 1000); // en secondes
    }

    // Créer le replay avec le prix original (les utilisateurs paient le même prix)
    const { data: replay, error: insertError } = await supabaseAdmin
      .from('private_live_replays')
      .insert({
        creator_id: liveStream.creator_id,
        private_live_request_id: privateRequestId,
        live_stream_id: liveStreamId,
        title: `Replay: ${liveStream.title}`,
        description: `Replay du live privé - ${privateRequest.proposed_duration || 20} minutes`,
        file_path: liveStream.recording_url, // Chemin R2 sécurisé
        thumbnail_url: liveStream.thumbnail_url,
        duration: duration,
        original_price: privateRequest.price,
        replay_price: privateRequest.price, // Même prix par défaut
        currency: privateRequest.currency || 'EUR',
        is_available: true
      })
      .select()
      .single();

    if (insertError) {
      logStep("Error creating replay", { error: insertError.message });
      return new Response(
        JSON.stringify({ error: 'Failed to create replay: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Replay saved successfully", { 
      replayId: replay.id, 
      originalPrice: privateRequest.price,
      duration 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        replayId: replay.id,
        message: 'Replay saved and available for purchase'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep("Error", { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
