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

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
    if (authResult.error) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userId = authResult.userId!;
    const { contentId } = await req.json();

    // SECURITY: contentId is MANDATORY - no arbitrary filePath access
    if (!contentId) {
      return new Response(JSON.stringify({ error: "contentId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch content from DB - filePath comes from DB, NEVER from client
    const { data: content } = await supabaseAdmin
      .from('content')
      .select('id, file_url, creator_id, is_premium, is_preview, status')
      .eq('id', contentId)
      .single();

    if (!content) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // SECURITY: Use file_url from DB (prevents BOLA)
    const filePath = content.file_url;

    // Check admin status once
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    const isAdmin = !!adminRole;

    // Get creator info once
    const { data: creator } = await supabaseAdmin
      .from('creators')
      .select('user_id')
      .eq('id', content.creator_id)
      .single();

    const isOwner = creator?.user_id === userId;

    // Block unpublished content (except owner/admin)
    if (content.status !== 'published' && !isOwner && !isAdmin) {
      return new Response(JSON.stringify({ error: "Content not available" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check subscription for premium non-preview content
    if (content.is_premium && !content.is_preview && !isOwner && !isAdmin) {
      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', userId)
        .eq('creator_id', content.creator_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!subscription) {
        return new Response(JSON.stringify({ error: "Subscription required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Log access for security alerting (non-blocking)
    supabaseAdmin.from('security_access_logs').insert({
      user_id: userId,
      endpoint: 'proxy-r2-image',
      resource_path: filePath,
      content_id: contentId,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
    }).then(() => {}).catch(() => {});

    // Extract R2 path from file_url
    let r2FilePath = filePath;
    try {
      if (filePath.startsWith('http')) {
        const url = new URL(filePath);
        r2FilePath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      }
    } catch {
      // Already a relative path
    }

    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";

    const signedUrl = await generatePresignedGetUrl(
      r2AccessKeyId, r2SecretAccessKey, 'auto', r2BucketName, r2FilePath, r2AccountId
    );

    const r2Response = await fetch(signedUrl);
    if (!r2Response.ok) {
      return new Response(JSON.stringify({ error: "Image not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const contentType = r2Response.headers.get("content-type") || "image/jpeg";
    const imageData = await r2Response.arrayBuffer();

    return new Response(imageData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0",
      }
    });
  } catch (error) {
    console.error("[proxy-r2-image] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
