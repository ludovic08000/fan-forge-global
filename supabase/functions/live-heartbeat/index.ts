import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { liveStreamId, action } = await req.json();

    if (action === 'heartbeat') {
      // Mettre à jour le heartbeat du live
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
      // Terminer le live immédiatement
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

    if (action === 'cleanup') {
      // Nettoyer les lives sans heartbeat depuis 2 minutes
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
