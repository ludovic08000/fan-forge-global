// v2 - CORS redeploy for theforge.fans
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
  
  const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/');
  const canonicalUri = `/${bucket}/${encodedKey}`;
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = encodeURIComponent(`${accessKeyId}/${credentialScope}`);
  
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
  
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  
  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
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
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // SECURITY: Proper JWT validation with signature verification
    const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
    
    if (authResult.error) {
      console.error("[get-replay-url] Auth failed:", authResult.error);
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId!;
    console.log("[get-replay-url] User authenticated:", userId);

    const { contentId, liveStreamId, filePath: clientFilePath } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let filePath: string;
    let creatorId: string;
    let isPremium = false;
    let hasAccess = false;

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRole) {
      hasAccess = true;
    }

    // Route 1: Live stream replay (liveStreamId provided)
    if (liveStreamId) {
      console.log("[get-replay-url] Fetching live stream replay:", liveStreamId);
      
      const { data: liveStream, error: liveError } = await supabaseAdmin
        .from("live_streams")
        .select("id, recording_url, creator_id, is_premium")
        .eq("id", liveStreamId)
        .single();

      if (liveError || !liveStream || !liveStream.recording_url) {
        console.error("[get-replay-url] Live stream not found:", liveError);
        return new Response(
          JSON.stringify({ error: "Replay not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      filePath = liveStream.recording_url;
      creatorId = liveStream.creator_id;
      isPremium = liveStream.is_premium || false;

      // Access control for live streams
      if (!hasAccess) {
        const { data: creator } = await supabaseAdmin
          .from("creators")
          .select("user_id")
          .eq("id", creatorId)
          .single();

        if (creator?.user_id === userId) {
          hasAccess = true;
        }

        if (!hasAccess && isPremium) {
          const { data: subscription } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("subscriber_id", userId)
            .eq("creator_id", creatorId)
            .eq("status", "active")
            .maybeSingle();

          if (subscription) hasAccess = true;
        }

        if (!hasAccess && !isPremium) {
          hasAccess = true;
        }
      }
    }
    // Route 2: Content-based replay (contentId provided)
    else if (contentId) {
      console.log("[get-replay-url] Fetching content replay:", contentId);
      
      const { data: content, error: contentError } = await supabaseAdmin
        .from("content")
        .select("id, file_url, creator_id, is_premium, tags")
        .eq("id", contentId)
        .single();

      if (contentError || !content) {
        console.error("[get-replay-url] Content not found:", contentError);
        return new Response(
          JSON.stringify({ error: "Content not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      filePath = content.file_url;
      creatorId = content.creator_id;
      isPremium = content.is_premium || false;

      // Access control for content
      if (!hasAccess) {
        const { data: creator } = await supabaseAdmin
          .from("creators")
          .select("user_id")
          .eq("id", creatorId)
          .single();

        if (creator?.user_id === userId) {
          hasAccess = true;
        }

        if (!hasAccess && isPremium) {
          const { data: subscription } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("subscriber_id", userId)
            .eq("creator_id", creatorId)
            .eq("status", "active")
            .maybeSingle();

          if (subscription) hasAccess = true;
        }

        if (!hasAccess && !isPremium) {
          hasAccess = true;
        }
      }
    }
    // Route 3: Direct filePath access (STRICT ALLOWLIST ONLY)
    // Purpose: allow only non-sensitive public-ish assets like avatars/covers/thumbnails.
    // Anything else must go through contentId/liveStreamId flows with proper access checks.
    else if (clientFilePath) {
      // Normalize path: remove leading slashes, collapse backslashes, prevent weird traversal
      const normalizedPath = String(clientFilePath)
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");

      // Basic sanity checks
      if (!normalizedPath || normalizedPath.length > 512) {
        return new Response(JSON.stringify({ error: "Invalid filePath" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (normalizedPath.includes("..")) {
        console.warn("[get-replay-url] BLOCKED path traversal attempt:", clientFilePath);
        return new Response(JSON.stringify({ error: "Invalid filePath" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ✅ STRICT allowlist: ONLY these prefixes are allowed
      const ALLOWED_PREFIXES = ["avatars/", "covers/", "thumbnails/"];
      const hasAllowedPrefix = ALLOWED_PREFIXES.some((p) =>
        normalizedPath.startsWith(p)
      );

      // Also allow story images (verified via DB)
      let isStoryImage = false;
      if (!hasAllowedPrefix) {
        const { data: storyMatch } = await supabaseAdmin
          .from("creator_stories")
          .select("id")
          .eq("image_url", normalizedPath)
          .gt("expires_at", new Date().toISOString())
          .limit(1)
          .maybeSingle();
        isStoryImage = !!storyMatch;
      }

      if (!hasAllowedPrefix && !isStoryImage) {
        console.warn("[get-replay-url] BLOCKED non-allowlisted path:", normalizedPath);
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[get-replay-url] Allowlisted filePath access:", normalizedPath);
      filePath = normalizedPath;
      creatorId = '';
      hasAccess = true;
    }
    // No valid identifier provided
    else {
      return new Response(
        JSON.stringify({ error: "contentId, liveStreamId, or filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied - subscription required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract actual file path from URL for R2
    let r2FilePath = filePath;
    if (filePath.includes('r2.cloudflarestorage.com')) {
      const urlPath = new URL(filePath).pathname;
      const pathParts = urlPath.split('/').filter(p => p);
      r2FilePath = pathParts.slice(1).join('/');
    } else if (filePath.startsWith('replays/')) {
      r2FilePath = filePath;
    } else {
      // Extract path from a custom domain URL
      try {
        const url = new URL(filePath);
        r2FilePath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      } catch {
        r2FilePath = filePath;
      }
    }

    // Get R2 credentials
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";

    const expiresIn = 300; // 5 minutes for replays

    const signedUrl = await generatePresignedUrl(
      r2AccessKeyId,
      r2SecretAccessKey,
      'auto',
      r2BucketName,
      r2FilePath,
      r2AccountId,
      expiresIn
    );

    console.log(`[get-replay-url] Generated signed URL for ${liveStreamId || contentId} for user ${userId}`);

    return new Response(
      JSON.stringify({
        url: signedUrl,  // Frontend expects "url" not "signedUrl"
        signedUrl,       // Keep for backwards compatibility
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        expiresIn,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[get-replay-url] Error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
