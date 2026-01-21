import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

// Allowed storage buckets (whitelist)
const ALLOWED_BUCKETS = ['content', 'avatars', 'covers', 'thumbnails', 'private-content'];

const logStep = (step: string, details?: any) => {
  console.log(`[GET-SIGNED-URL] ${step}`, details ? JSON.stringify(details) : '');
};

const generateRequestId = (): string => {
  return crypto.randomUUID().substring(0, 8);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    logStep('Starting signed URL generation', { requestId });

    // Validate JWT with proper signature verification
    const authResult = await validateJwtAndGetUserId(req.headers.get('Authorization'));
    
    if (authResult.error) {
      logStep('Auth failed', { error: authResult.error, requestId });
      return new Response(
        JSON.stringify({ error: authResult.error, requestId }),
        { status: authResult.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authResult.userId!;
    logStep('User authenticated', { userId, requestId });

    const { contentId, bucket } = await req.json();

    // SECURITY: contentId is now REQUIRED - we no longer accept arbitrary filePath
    if (!contentId) {
      return new Response(
        JSON.stringify({ error: 'contentId is required', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate bucket against allowlist
    if (bucket && !ALLOWED_BUCKETS.includes(bucket)) {
      logStep('Invalid bucket requested', { bucket, requestId });
      return new Response(
        JSON.stringify({ error: 'Invalid bucket', requestId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Fetch the content from DB and get the ACTUAL file_url
    // We no longer trust client-provided filePath
    const { data: content, error: contentError } = await supabaseAdmin
      .from('content')
      .select('id, file_url, creator_id, is_premium, is_preview')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      logStep('Content not found', { contentId, error: contentError, requestId });
      return new Response(
        JSON.stringify({ error: 'Content not found', requestId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract file path and bucket from the stored URL
    const fileUrl = content.file_url;
    let actualBucket: string;
    let actualFilePath: string;

    // Parse the Supabase storage URL to extract bucket and path
    const storageUrlMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (storageUrlMatch) {
      actualBucket = storageUrlMatch[1];
      actualFilePath = decodeURIComponent(storageUrlMatch[2]);
    } else {
      // Handle direct path format
      const pathParts = fileUrl.split('/');
      if (pathParts.length >= 2) {
        actualBucket = bucket || 'content';
        actualFilePath = fileUrl;
      } else {
        logStep('Invalid file URL format', { fileUrl, requestId });
        return new Response(
          JSON.stringify({ error: 'Invalid file URL', requestId }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify bucket is allowed
    if (!ALLOWED_BUCKETS.includes(actualBucket)) {
      logStep('Bucket not in allowlist', { actualBucket, requestId });
      return new Response(
        JSON.stringify({ error: 'Access denied', requestId }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Access control: Check subscription for premium content
    if (content.is_premium && !content.is_preview) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', userId)
        .eq('creator_id', content.creator_id)
        .eq('status', 'active')
        .maybeSingle();

      const { data: creator } = await supabaseAdmin
        .from('creators')
        .select('user_id')
        .eq('id', content.creator_id)
        .single();

      const isCreator = creator?.user_id === userId;
      const isAdmin = await checkIsAdmin(supabaseAdmin, userId);

      if (!subscription && !isCreator && !isAdmin) {
        logStep('Access denied - no subscription', { userId, creatorId: content.creator_id, requestId });
        return new Response(
          JSON.stringify({ error: 'Subscription required', requestId }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logStep('Access granted', { isSubscribed: !!subscription, isCreator, isAdmin, requestId });
    }

    // Generate signed URL for the ACTUAL file path from DB (not client-provided)
    const expiresIn = 3600;
    
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from(actualBucket)
      .createSignedUrl(actualFilePath, expiresIn);

    if (signedUrlError) {
      logStep('Failed to create signed URL', { error: signedUrlError, requestId });
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL', requestId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Signed URL generated successfully', { contentId, expiresIn, requestId });

    return new Response(
      JSON.stringify({ 
        signedUrl: signedUrlData.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        requestId,
        issuedAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Error', { error: error.message, requestId });
    return new Response(
      JSON.stringify({ error: 'Internal server error', requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkIsAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}
