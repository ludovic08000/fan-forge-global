/**
 * Supprime un fichier de R2 par son filePath
 * Vérifie que l'utilisateur est bien propriétaire du fichier (préfixe userId/)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3@3.600.0";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
    if (authResult.error) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: authResult.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authResult.userId!;
    const { filePath } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "filePath is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Security: ensure user can only delete their own files
    if (!filePath.startsWith(`${userId}/`)) {
      console.error(`[delete-r2-file] Unauthorized: user ${userId} tried to delete ${filePath}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID');
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const r2BucketName = Deno.env.get('R2_BUCKET_NAME') || 'crub';

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      return new Response(
        JSON.stringify({ error: "R2 not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    await s3Client.send(new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: filePath,
    }));

    console.log(`[delete-r2-file] Deleted: ${filePath}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[delete-r2-file] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
