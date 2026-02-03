/**
 * Récupère une URL signée pour accéder à un replay de live privé
 * L'utilisateur doit avoir acheté le replay
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.600.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.600.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-PRIVATE-REPLAY-URL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { replayId } = body;

    if (!replayId) {
      return new Response(
        JSON.stringify({ error: 'replayId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Checking access", { userId, replayId });

    // Récupérer le replay
    const { data: replay, error: replayError } = await supabaseAdmin
      .from('private_live_replays')
      .select('file_path, creator_id, creators!inner(user_id)')
      .eq('id', replayId)
      .single();

    if (replayError || !replay) {
      return new Response(
        JSON.stringify({ error: 'Replay not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creatorUserId = (replay.creators as any)?.user_id;

    // Vérifier l'accès: soit le créateur, soit un acheteur
    const isCreator = creatorUserId === userId;
    
    let hasAccess = isCreator;
    
    if (!isCreator) {
      const { data: purchase } = await supabaseAdmin
        .from('private_live_replay_purchases')
        .select('id')
        .eq('replay_id', replayId)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .maybeSingle();
      
      hasAccess = !!purchase;
    }

    if (!hasAccess) {
      logStep("Access denied", { userId, replayId });
      return new Response(
        JSON.stringify({ error: 'You must purchase this replay to view it' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer l'URL signée R2
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME') || 'fanforge-replays';

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      logStep("R2 configuration missing");
      return new Response(
        JSON.stringify({ error: 'Storage configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: replay.file_path,
    });

    // URL valide pendant 2 heures
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 7200 });

    // Incrémenter le compteur de vues
    await supabaseAdmin
      .from('private_live_replays')
      .update({ view_count: supabaseAdmin.sql`view_count + 1` })
      .eq('id', replayId);

    logStep("URL generated successfully", { replayId, userId });

    return new Response(
      JSON.stringify({ url: signedUrl, expiresIn: 7200 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
