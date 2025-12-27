import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (action === 'heartbeat') {
      if (!liveStreamId) {
        return new Response(
          JSON.stringify({ error: 'liveStreamId required for heartbeat' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    if (action === 'end') {
      if (!liveStreamId) {
        return new Response(
          JSON.stringify({ error: 'liveStreamId required for end' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    if (action === 'cleanup') {
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
