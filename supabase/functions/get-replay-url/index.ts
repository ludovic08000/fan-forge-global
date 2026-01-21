import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.490.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.490.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { filePath, contentId } = await req.json();
    
    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check access rights
    let hasAccess = false;

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (adminRole) {
      hasAccess = true;
    }

    // If contentId provided, check content ownership and subscription
    if (!hasAccess && contentId) {
      // Get content details
      const { data: content } = await supabase
        .from("content")
        .select("creator_id, is_premium")
        .eq("id", contentId)
        .single();

      if (content) {
        // Check if user is the creator
        const { data: creator } = await supabase
          .from("creators")
          .select("id, user_id")
          .eq("id", content.creator_id)
          .single();

        if (creator?.user_id === user.id) {
          hasAccess = true;
        }

        // If premium content, check subscription
        if (!hasAccess && content.is_premium) {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("subscriber_id", user.id)
            .eq("creator_id", content.creator_id)
            .eq("status", "active")
            .single();

          if (subscription) {
            hasAccess = true;
          }
        }

        // If not premium, allow access
        if (!hasAccess && !content.is_premium) {
          hasAccess = true;
        }
      }
    }

    // If no contentId, try to extract creator_id from file path
    // Format: replays/{creator_id}/{filename}.mp4
    if (!hasAccess && !contentId) {
      const pathMatch = filePath.match(/^replays\/([a-f0-9-]+)\//);
      if (pathMatch) {
        const creatorId = pathMatch[1];
        
        // Check if user is the creator
        const { data: creator } = await supabase
          .from("creators")
          .select("id, user_id")
          .eq("id", creatorId)
          .single();

        if (creator?.user_id === user.id) {
          hasAccess = true;
        }

        // Check subscription to this creator
        if (!hasAccess) {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("subscriber_id", user.id)
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

    // Initialize R2 client
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    // Generate presigned URL (expires in 1 hour)
    const command = new GetObjectCommand({
      Bucket: r2BucketName,
      Key: filePath,
    });

    const expiresIn = 3600; // 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log(`[get-replay-url] Generated signed URL for ${filePath} for user ${user.id}`);

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
