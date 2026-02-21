import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Helper: Convert ArrayBuffer to hex string
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: HMAC-SHA256
async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

// Helper: SHA256 hash
async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return toHex(hash);
}

// Generate AWS Signature V4 presigned URL for PUT
async function generatePresignedPutUrl(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucket: string,
  key: string,
  accountId: string,
  _contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;

  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const canonicalUri = `/${bucket}/${encodedKey}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = encodeURIComponent(`${accessKeyId}/${credentialScope}`);

  // Only sign 'host' header - do NOT sign content-type to avoid mismatch
  const queryParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiresIn.toString()],
    ['X-Amz-SignedHeaders', 'host'],
  ];

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  console.log('[r2-upload-url] Canonical URI:', canonicalUri);
  console.log('[r2-upload-url] Signed headers:', signedHeaders);

  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const signatureBuffer = await hmacSha256(kSigning, stringToSign);
  const signature = toHex(signatureBuffer);

  return `${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

serve(async (req) => {
  console.log("[r2-upload-url] Request received:", req.method, "from:", req.headers.get("Origin"));
  console.log("[r2-upload-url] Auth header present:", !!req.headers.get("Authorization"));
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Authenticate user
    const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
    if (authResult.error) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId!;
    const { fileName, contentType, fileSize } = await req.json();

    if (!fileName || !contentType) {
      return new Response(
        JSON.stringify({ error: "fileName and contentType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 500 MB)
    if (fileSize && fileSize > 500 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 500 MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
    ];
    if (!allowedTypes.includes(contentType)) {
      return new Response(
        JSON.stringify({ error: "Unsupported content type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch creator's stage_name to use as folder name
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: creatorData } = await supabaseAdmin
      .from('creators')
      .select('stage_name')
      .eq('user_id', userId)
      .single();

    // Sanitize stage_name for use as folder name (remove special chars, lowercase)
    const rawName = creatorData?.stage_name || userId;
    const folderName = rawName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9_-]/g, '_') // replace special chars with _
      .replace(/_+/g, '_') // collapse multiple underscores
      .replace(/^_|_$/g, ''); // trim underscores

    // Generate a secure file key: {creatorName}/images|videos/{timestamp}-{id}.{ext}
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const random = crypto.randomUUID().substring(0, 8);
    const subfolder = contentType.startsWith('video/') ? 'videos' : 'images';
    const r2Key = `${folderName}/${subfolder}/${timestamp}-${random}.${ext}`;

    // Get R2 credentials
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";

    const expiresIn = 600; // 10 minutes to upload

    const uploadUrl = await generatePresignedPutUrl(
      r2AccessKeyId,
      r2SecretAccessKey,
      'auto',
      r2BucketName,
      r2Key,
      r2AccountId,
      contentType,
      expiresIn
    );

    console.log(`[r2-upload-url] Generated presigned PUT URL for user ${userId}, key: ${r2Key}`);

    return new Response(
      JSON.stringify({
        uploadUrl,
        filePath: r2Key,
        expiresIn,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[r2-upload-url] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
