import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Convert ArrayBuffer to hex string
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: HMAC-SHA256
async function hmacSha256(key: ArrayBuffer | string, data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' 
    ? encoder.encode(key) 
    : new Uint8Array(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  return await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(data)
  );
}

// Helper: SHA256 hash
async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(data)
  );
  return toHex(hash);
}

// Generate AWS Signature V4 presigned URL for S3/R2
async function generatePresignedUrl(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
  bucket: string,
  key: string,
  accountId: string,
  expiresIn: number = 3600
): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;
  
  // URI encode the key (file path)
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const canonicalUri = `/${bucket}/${encodedKey}`;
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = encodeURIComponent(`${accessKeyId}/${credentialScope}`);
  
  // Build query parameters (must be sorted alphabetically)
  const queryParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiresIn.toString()],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  
  const canonicalQueryString = queryParams
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  
  // Canonical headers
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  
  // For presigned URLs, payload is UNSIGNED-PAYLOAD
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  // Create canonical request
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // Create string to sign
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');
  
  // Calculate signing key
  const kDate = await hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  
  // Calculate signature
  const signatureBuffer = await hmacSha256(kSigning, stringToSign);
  const signature = toHex(signatureBuffer);
  
  // Build final URL
  const presignedUrl = `${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  
  return presignedUrl;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user authentication using getClaims (works with signing-keys)
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[get-replay-url] getClaims failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("[get-replay-url] User authenticated via getClaims:", userId);

    // Parse request body
    const { filePath, contentId } = await req.json();
    
    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database queries
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check access rights
    let hasAccess = false;

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (adminRole) {
      hasAccess = true;
    }

    // If contentId provided, check content ownership and subscription
    if (!hasAccess && contentId) {
      const { data: content } = await supabaseAdmin
        .from("content")
        .select("creator_id, is_premium")
        .eq("id", contentId)
        .single();

      if (content) {
        const { data: creator } = await supabaseAdmin
          .from("creators")
          .select("id, user_id")
          .eq("id", content.creator_id)
          .single();

        if (creator?.user_id === userId) {
          hasAccess = true;
        }

        if (!hasAccess && content.is_premium) {
          const { data: subscription } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("subscriber_id", userId)
            .eq("creator_id", content.creator_id)
            .eq("status", "active")
            .single();

          if (subscription) {
            hasAccess = true;
          }
        }

        if (!hasAccess && !content.is_premium) {
          hasAccess = true;
        }
      }
    }

    // If no contentId, try to extract creator_id from file path
    if (!hasAccess && !contentId) {
      const pathMatch = filePath.match(/^replays\/([a-f0-9-]+)\//);
      if (pathMatch) {
        const creatorId = pathMatch[1];
        
        const { data: creator } = await supabaseAdmin
          .from("creators")
          .select("id, user_id")
          .eq("id", creatorId)
          .single();

        if (creator?.user_id === userId) {
          hasAccess = true;
        }

        if (!hasAccess) {
          const { data: subscription } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("subscriber_id", userId)
            .eq("creator_id", creatorId)
            .eq("status", "active")
            .single();

          if (subscription) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied - subscription required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get R2 credentials
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";

    const expiresIn = 3600; // 1 hour

    // Generate presigned URL
    const signedUrl = await generatePresignedUrl(
      r2AccessKeyId,
      r2SecretAccessKey,
      'auto',
      r2BucketName,
      filePath,
      r2AccountId,
      expiresIn
    );

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log(`[get-replay-url] Generated signed URL for ${filePath} for user ${userId}`);

    return new Response(
      JSON.stringify({
        signedUrl,
        expiresAt,
        expiresIn,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[get-replay-url] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
