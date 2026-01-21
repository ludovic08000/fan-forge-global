/**
 * Edge Function pour gérer les heartbeat des lives
 * SECURISE: authentification obligatoire pour end, cron secret pour cleanup
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateJwtAndGetUserId, verifyCronSecret } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Rate limiting en mémoire (simple pour heartbeat)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // 60 requêtes par minute
const RATE_WINDOW = 60000; // 1 minute

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
};

// Validation UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Récupérer l'IP pour rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Vérifier le rate limit
    if (!checkRateLimit(ipAddress)) {
      console.warn(`[Heartbeat] Rate limited: ${ipAddress}`);
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parser et valider le body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { liveStreamId, action } = body;

    // Valider liveStreamId si fourni
    if (liveStreamId && !isValidUUID(liveStreamId)) {
      console.warn(`[Heartbeat] Invalid liveStreamId format: ${liveStreamId}`);
      return new Response(
        JSON.stringify({ error: 'Invalid liveStreamId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valider action
    const validActions = ['heartbeat', 'end', 'cleanup'];
    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be: heartbeat, end, or cleanup' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== HEARTBEAT: Auth required, verify ownership =====
    if (action === 'heartbeat') {
      if (!liveStreamId) {
        return new Response(
          JSON.stringify({ error: 'liveStreamId required for heartbeat' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier l'authentification
      const authHeader = req.headers.get('Authorization');
      const { userId, error: authError, statusCode } = await validateJwtAndGetUserId(authHeader);
      
      if (authError || !userId) {
        console.warn('[Heartbeat] Auth failed:', authError);
        return new Response(
          JSON.stringify({ error: authError || 'Unauthorized' }),
          { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier que l'utilisateur est propriétaire du live
      const { data: liveStream, error: streamError } = await supabase
        .from('live_streams')
        .select('id, creator_id, creators!inner(user_id)')
        .eq('id', liveStreamId)
        .eq('status', 'live')
        .single();

      if (streamError || !liveStream) {
        console.warn('[Heartbeat] Stream not found or not live:', liveStreamId);
        return new Response(
          JSON.stringify({ error: 'Live stream not found or not active' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier ownership
      const creatorUserId = (liveStream as any).creators?.user_id;
      if (creatorUserId !== userId) {
        console.warn('[Heartbeat] Ownership mismatch:', { userId, creatorUserId });
        return new Response(
          JSON.stringify({ error: 'Not authorized to update this stream' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Heartbeat] Updating heartbeat for stream: ${liveStreamId}`);
      
      const { error } = await supabase
        .from('live_streams')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('id', liveStreamId)
        .eq('status', 'live');

      if (error) {
        console.error('[Heartbeat] Error updating:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== END: Auth required, verify ownership =====
    if (action === 'end') {
      if (!liveStreamId) {
        return new Response(
          JSON.stringify({ error: 'liveStreamId required for end' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier l'authentification
      const authHeader = req.headers.get('Authorization');
      const { userId, error: authError, statusCode } = await validateJwtAndGetUserId(authHeader);
      
      if (authError || !userId) {
        console.warn('[End] Auth failed:', authError);
        return new Response(
          JSON.stringify({ error: authError || 'Unauthorized' }),
          { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier que l'utilisateur est propriétaire du live
      const { data: liveStream, error: streamError } = await supabase
        .from('live_streams')
        .select('id, creator_id, creators!inner(user_id)')
        .eq('id', liveStreamId)
        .single();

      if (streamError || !liveStream) {
        console.warn('[End] Stream not found:', liveStreamId);
        return new Response(
          JSON.stringify({ error: 'Live stream not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier ownership
      const creatorUserId = (liveStream as any).creators?.user_id;
      if (creatorUserId !== userId) {
        console.warn('[End] Ownership mismatch:', { userId, creatorUserId });
        return new Response(
          JSON.stringify({ error: 'Not authorized to end this stream' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[End] Ending stream: ${liveStreamId}`);
      
      const { error } = await supabase
        .from('live_streams')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', liveStreamId);

      if (error) {
        console.error('[End] Error ending stream:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== CLEANUP: Cron secret required =====
    if (action === 'cleanup') {
      // Vérifier le secret cron
      if (!verifyCronSecret(req)) {
        console.warn('[Cleanup] Invalid or missing cron secret');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[Cleanup] Checking for stale live streams...');
      
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data: staleLives, error: selectError } = await supabase
        .from('live_streams')
        .select('id, title')
        .eq('status', 'live')
        .lt('last_heartbeat', twoMinutesAgo);

      if (selectError) {
        console.error('[Cleanup] Error selecting stale lives:', selectError);
        throw selectError;
      }

      if (staleLives && staleLives.length > 0) {
        console.log(`[Cleanup] Found ${staleLives.length} stale lives:`, staleLives.map(l => l.title));
        
        const { error: updateError } = await supabase
          .from('live_streams')
          .update({ 
            status: 'ended', 
            ended_at: new Date().toISOString() 
          })
          .eq('status', 'live')
          .lt('last_heartbeat', twoMinutesAgo);

        if (updateError) {
          console.error('[Cleanup] Error ending stale lives:', updateError);
          throw updateError;
        }

        console.log(`[Cleanup] Ended ${staleLives.length} stale live streams`);
      } else {
        console.log('[Cleanup] No stale lives found');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          endedCount: staleLives?.length || 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[live-heartbeat] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
