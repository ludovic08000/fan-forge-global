import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

/**
 * R2 Upload Proxy - uploads file through the edge function to bypass CORS
 * Receives the file as multipart/form-data, uploads to R2 via S3 API
 */

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
async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
}

// Upload to R2 using AWS Signature V4 (PUT)
async function uploadToR2(
  fileData: Uint8Array,
  contentType: string,
  r2Key: string,
): Promise<Response> {
  const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
  const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";

  const region = 'auto';
  const service = 's3';
  const host = `${r2AccountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const encodedKey = r2Key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const canonicalUri = `/${r2BucketName}/${encodedKey}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const payloadHash = await sha256(fileData);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  const kDate = await hmacSha256(`AWS4${r2SecretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const signatureBuffer = await hmacSha256(kSigning, stringToSign);
  const signature = toHex(signatureBuffer);

  const authorization = `AWS4-HMAC-SHA256 Credential=${r2AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const r2Response = await fetch(`${endpoint}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Host': host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Authorization': authorization,
    },
    body: fileData,
  });

  return r2Response;
}

serve(async (req) => {
  console.log("[r2-upload] Request received:", req.method);

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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileName = formData.get('fileName') as string || file?.name || 'upload.bin';
    const contentType = formData.get('contentType') as string || file?.type || 'application/octet-stream';

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 1 GB)
    if (file.size > 1024 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 1 GB)" }),
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

    // Fetch creator's stage_name
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: creatorData } = await supabaseAdmin
      .from('creators')
      .select('stage_name')
      .eq('user_id', userId)
      .single();

    const rawName = creatorData?.stage_name || userId;
    const folderName = rawName
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const random = crypto.randomUUID().substring(0, 8);
    const subfolder = contentType.startsWith('video/') ? 'videos' : 'images';
    const r2Key = `${folderName}/${subfolder}/${timestamp}-${random}.${ext}`;

    // Read file into memory
    const fileData = new Uint8Array(await file.arrayBuffer());

    console.log(`[r2-upload] Uploading ${fileData.length} bytes to R2 key: ${r2Key}`);

    // Upload to R2
    const r2Response = await uploadToR2(fileData, contentType, r2Key);

    if (!r2Response.ok) {
      const errorText = await r2Response.text();
      console.error(`[r2-upload] R2 upload failed: ${r2Response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `R2 upload failed: ${r2Response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[r2-upload] Upload successful for user ${userId}, key: ${r2Key}`);

    return new Response(
      JSON.stringify({
        success: true,
        filePath: r2Key,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[r2-upload] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
