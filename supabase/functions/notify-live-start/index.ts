/**
 * Edge Function pour notifier les abonnés du démarrage d'un live
 * SECURISE: authentification obligatoire, vérification propriétaire
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation UUID
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Rate limiting par utilisateur
const userRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 5 notifications par minute par user
const RATE_WINDOW = 60000;

const checkUserRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const record = userRateLimitMap.get(userId);
  
  if (!record || now > record.resetAt) {
    userRateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
};

// Cooldown par live (pour éviter double-notification même en cas de rejeu)
const notificationCache = new Map<string, number>();
const NOTIFICATION_COOLDOWN = 60000; // 1 minute

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== AUTHENTIFICATION OBLIGATOIRE =====
    const authHeader = req.headers.get('Authorization');
    const { userId, error: authError, statusCode } = await validateJwtAndGetUserId(authHeader);
    
    if (authError || !userId) {
      console.warn('[notify-live-start] Auth failed:', authError);
      return new Response(
        JSON.stringify({ error: authError || 'Unauthorized' }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit par utilisateur
    if (!checkUserRateLimit(userId)) {
      console.warn('[notify-live-start] Rate limited user:', userId);
      return new Response(
        JSON.stringify({ error: 'Too many notification requests' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { live_stream_id, creator_id } = body;

    // Validation des paramètres
    if (!live_stream_id || !isValidUUID(live_stream_id)) {
      console.warn('[notify-live-start] Invalid live_stream_id:', live_stream_id);
      return new Response(
        JSON.stringify({ error: 'Invalid live_stream_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!creator_id || !isValidUUID(creator_id)) {
      console.warn('[notify-live-start] Invalid creator_id:', creator_id);
      return new Response(
        JSON.stringify({ error: 'Invalid creator_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le cooldown pour éviter le spam
    const lastNotification = notificationCache.get(live_stream_id);
    if (lastNotification && Date.now() - lastNotification < NOTIFICATION_COOLDOWN) {
      console.log('[notify-live-start] Notification cooldown active for:', live_stream_id);
      return new Response(
        JSON.stringify({ success: true, notified: 0, reason: 'cooldown' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[notify-live-start] Processing:', { live_stream_id, creator_id, userId });

    // Vérifier que le live stream existe et appartient au créateur
    const { data: liveStream, error: liveError } = await supabase
      .from('live_streams')
      .select('title, creator_id, status')
      .eq('id', live_stream_id)
      .single();

    if (liveError || !liveStream) {
      console.error('[notify-live-start] Live stream not found:', liveError);
      return new Response(
        JSON.stringify({ error: 'Live stream not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que le creator_id correspond
    if (liveStream.creator_id !== creator_id) {
      console.warn('[notify-live-start] Creator mismatch:', { expected: liveStream.creator_id, received: creator_id });
      return new Response(
        JSON.stringify({ error: 'Creator mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get creator details et vérifier que l'utilisateur est le propriétaire
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('stage_name, user_id')
      .eq('id', creator_id)
      .single();

    if (creatorError || !creator) {
      console.error('[notify-live-start] Creator not found:', creatorError);
      return new Response(
        JSON.stringify({ error: 'Creator not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== VÉRIFICATION PROPRIÉTAIRE =====
    if (creator.user_id !== userId) {
      console.warn('[notify-live-start] User is not the creator owner:', { userId, creatorUserId: creator.user_id });
      return new Response(
        JSON.stringify({ error: 'Not authorized to send notifications for this creator' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active subscribers of this creator
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('subscriber_id')
      .eq('creator_id', creator_id)
      .eq('status', 'active');

    if (subsError) {
      console.error('[notify-live-start] Error fetching subscriptions:', subsError);
      throw subsError;
    }

    console.log(`[notify-live-start] Found ${subscriptions?.length || 0} subscribers to notify`);

    // Create notifications for all subscribers (limité à 1000 pour éviter les abus)
    const maxNotifications = 1000;
    const limitedSubscriptions = subscriptions?.slice(0, maxNotifications) || [];
    
    const notifications = limitedSubscriptions.map((sub) => ({
      user_id: sub.subscriber_id,
      type: 'live_started',
      title: `${creator.stage_name || 'Un créateur'} est en live !`,
      message: `"${liveStream.title}" vient de commencer`,
      data: {
        live_stream_id,
        creator_id,
      },
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('[notify-live-start] Error creating notifications:', notifError);
        throw notifError;
      }

      // Mettre à jour le cache
      notificationCache.set(live_stream_id, Date.now());

      console.log(`[notify-live-start] Successfully sent ${notifications.length} notifications`);
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
    console.error('[notify-live-start] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
