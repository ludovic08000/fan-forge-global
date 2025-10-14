import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { live_stream_id, creator_id } = await req.json();

    console.log('Notifying subscribers about live stream:', { live_stream_id, creator_id });

    // Get live stream details
    const { data: liveStream, error: liveError } = await supabase
      .from('live_streams')
      .select('title, creator_id')
      .eq('id', live_stream_id)
      .single();

    if (liveError) {
      console.error('Error fetching live stream:', liveError);
      throw liveError;
    }

    // Get creator details
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('stage_name, user_id')
      .eq('id', creator_id)
      .single();

    if (creatorError) {
      console.error('Error fetching creator:', creatorError);
      throw creatorError;
    }

    // Get all subscribers of this creator
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('subscriber_id')
      .eq('creator_id', creator_id)
      .eq('status', 'active');

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw subsError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscribers to notify`);

    // Create notifications for all subscribers
    const notifications = subscriptions?.map((sub) => ({
      user_id: sub.subscriber_id,
      type: 'live_started',
      title: `${creator.stage_name} est en live !`,
      message: `"${liveStream.title}" vient de commencer`,
      data: {
        live_stream_id,
        creator_id,
      },
    })) || [];

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
        throw notifError;
      }

      console.log(`Successfully sent ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in notify-live-start:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
