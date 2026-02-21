import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Helper functions for AWS V4 signing
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return toHex(hash);
}

async function generatePresignedGetUrl(
  accessKeyId: string, secretAccessKey: string, region: string,
  bucket: string, key: string, accountId: string, expiresIn: number = 120
): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const encodedKey = key.split('/').map(s => encodeURIComponent(s)).join('/');
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const credential = encodeURIComponent(`${accessKeyId}/${credentialScope}`);

  const queryParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiresIn.toString()],
    ['X-Amz-SignedHeaders', 'host'],
  ];

  const canonicalQueryString = queryParams.map(([k, v]) => `${k}=${v}`).join('&');
  const canonicalRequest = ['GET', canonicalUri, canonicalQueryString, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256(canonicalRequest)].join('\n');

  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

const logStep = (step: string, details?: any) => {
  console.log(`[proxy-r2-video] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    // JWT mandatory
    const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
    if (authResult.error) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = authResult.userId!;
    const { filePath, contentId } = await req.json();

    if (!filePath) {
      return new Response(JSON.stringify({ error: "filePath required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: If contentId is provided, verify access rights
    if (contentId) {
      const { data: content } = await supabaseAdmin
        .from('content')
        .select('id, file_url, creator_id, is_premium, is_preview, status')
        .eq('id', contentId)
        .single();

      if (!content) {
        logStep('Content not found', { contentId });
        return new Response(JSON.stringify({ error: "Content not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Block access to unpublished content (except creator/admin)
      if (content.status !== 'published') {
        const { data: creator } = await supabaseAdmin
          .from('creators')
          .select('user_id')
          .eq('id', content.creator_id)
          .single();

        const isOwner = creator?.user_id === userId;
        const { data: adminRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();

        if (!isOwner && !adminRole) {
          logStep('Access denied - unpublished', { contentId, userId });
          return new Response(JSON.stringify({ error: "Content not available" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // Check subscription for premium non-preview content
      if (content.is_premium && !content.is_preview) {
        const { data: creator } = await supabaseAdmin
          .from('creators')
          .select('user_id')
          .eq('id', content.creator_id)
          .single();

        const isOwner = creator?.user_id === userId;

        if (!isOwner) {
          const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', userId)
            .eq('creator_id', content.creator_id)
            .eq('status', 'active')
            .maybeSingle();

          const { data: adminRole } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('role', 'admin')
            .maybeSingle();

          if (!subscription && !adminRole) {
            logStep('Access denied - no subscription', { contentId, userId });
            return new Response(JSON.stringify({ error: "Subscription required" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
      }
    }

    // Log access for alerting
    await supabaseAdmin.from('security_access_logs').insert({
      user_id: userId,
      endpoint: 'proxy-r2-video',
      resource_path: filePath,
      content_id: contentId || null,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
    }).catch(() => {}); // Non-blocking

    // Generate short-lived presigned URL and redirect (302) for streaming
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";

    const signedUrl = await generatePresignedGetUrl(
      r2AccessKeyId, r2SecretAccessKey, 'auto', r2BucketName, filePath, r2AccountId, 120
    );

    logStep('Generated signed video URL', { userId, filePath: filePath.substring(0, 30) });

    // Return the signed URL (not proxying the bytes - videos are too large)
    return new Response(
      JSON.stringify({
        url: signedUrl,
        expiresAt: new Date(Date.now() + 120 * 1000).toISOString(),
        expiresIn: 120,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store, max-age=0",
        }
      }
    );
  } catch (error) {
    console.error("[proxy-r2-video] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});