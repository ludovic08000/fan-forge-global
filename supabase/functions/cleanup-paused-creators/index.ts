import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, CopyObjectCommand } from "npm:@aws-sdk/client-s3@3.600.0";
import { verifyCronSecret } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    if (!verifyCronSecret(req)) {
      console.error("[Cleanup Paused Creators] Unauthorized: Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting cleanup of paused creators...");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Récupérer les créateurs en pause depuis plus d'un mois
    const { data: pausedCreators, error: fetchError } = await supabaseAdmin
      .from("creators")
      .select("id, user_id, stripe_account_id, stage_name")
      .eq("is_paused", true)
      .lt("paused_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error("Error fetching paused creators:", fetchError);
      throw fetchError;
    }

    if (!pausedCreators || pausedCreators.length === 0) {
      console.log("No paused creators to clean up.");
      return new Response(
        JSON.stringify({ success: true, deletedCount: 0, message: "Aucun compte à nettoyer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Init Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" }) : null;

    // Init R2 S3 client
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID");
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "crub";
    
    let s3Client: S3Client | null = null;
    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
      s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
    }

    let deletedCount = 0;

    for (const creator of pausedCreators) {
      console.log(`Processing creator ${creator.id} (${creator.stage_name})...`);

      try {
        // ÉTAPE 0: Archiver les fichiers flaggés dans legal-archives/ AVANT suppression
        if (s3Client) {
          await archiveEvidenceFiles(s3Client, r2BucketName, supabaseAdmin, creator.user_id, creator.id);
        }

        // ÉTAPE 1: Supprimer le compte Stripe Connect
        if (stripe && creator.stripe_account_id) {
          try {
            await stripe.accounts.del(creator.stripe_account_id);
            console.log(`Stripe account ${creator.stripe_account_id} deleted`);
          } catch (stripeErr: any) {
            console.warn(`Stripe deletion warning for ${creator.stripe_account_id}:`, stripeErr.message);
          }
        }

        // ÉTAPE 2: Supprimer tous les fichiers R2 du créateur (sauf legal-archives/)
        if (s3Client && creator.stage_name) {
          const sanitizedName = creator.stage_name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
          await deleteR2Prefix(s3Client, r2BucketName, `${sanitizedName}/`);
          console.log(`R2 files for ${sanitizedName}/ deleted`);
        }

        // Aussi supprimer les fichiers R2 référencés dans le contenu
        const { data: contentFiles } = await supabaseAdmin
          .from("content")
          .select("file_url, thumbnail_url")
          .eq("creator_id", creator.id);

        if (s3Client && contentFiles) {
          const keys = contentFiles
            .flatMap((c) => [c.file_url, c.thumbnail_url])
            .filter((k): k is string => Boolean(k) && !k.startsWith("legal-archives/"));
          
          if (keys.length > 0) {
            await deleteR2Keys(s3Client, r2BucketName, keys);
            console.log(`${keys.length} content R2 files deleted`);
          }
        }

        // ÉTAPE 3: Supprimer les données DB via la fonction existante
        // (archive_illegal_content_evidence est appelée dedans avec IP + logs)
        const { error: deleteErr } = await supabaseAdmin.rpc("delete_creator_completely", {
          _creator_id: creator.id,
        });

        if (deleteErr) {
          console.error(`Error deleting creator ${creator.id}:`, deleteErr);
          continue;
        }

        deletedCount++;
        console.log(`Creator ${creator.id} fully deleted (DB + Stripe + R2, evidence archived)`);
      } catch (creatorErr) {
        console.error(`Error processing creator ${creator.id}:`, creatorErr);
      }
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} paused creator accounts.`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `${deletedCount} compte(s) créateur(s) supprimé(s) (DB + Stripe + R2, preuves archivées)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur lors du nettoyage" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

/**
 * Copie les fichiers flaggés par l'IA dans le dossier legal-archives/{user_id}/
 * avant que les originaux soient supprimés
 */
async function archiveEvidenceFiles(
  s3Client: S3Client,
  bucket: string,
  supabaseAdmin: any,
  userId: string,
  creatorId: string
) {
  // Récupérer les fichiers flaggés par l'IA
  const { data: flaggedContent } = await supabaseAdmin
    .from("ai_moderation_queue")
    .select("file_url, thumbnail_url, ai_category, status")
    .eq("user_id", userId)
    .or("ai_category.in.(illegal,child_exploitation,csam,violence_extreme),status.in.(quarantined,rejected)");

  if (!flaggedContent || flaggedContent.length === 0) {
    console.log(`No flagged content to archive for user ${userId}`);
    return;
  }

  console.log(`Archiving ${flaggedContent.length} flagged files for user ${userId}...`);

  for (const item of flaggedContent) {
    const filesToCopy = [item.file_url, item.thumbnail_url].filter(Boolean);
    
    for (const sourceKey of filesToCopy) {
      const destKey = `legal-archives/${userId}/${sourceKey}`;
      try {
        await s3Client.send(new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${sourceKey}`,
          Key: destKey,
        }));
        console.log(`Archived: ${sourceKey} → ${destKey}`);
      } catch (copyErr: any) {
        // Le fichier peut ne plus exister (déjà en quarantaine par ex.)
        console.warn(`Could not archive ${sourceKey}: ${copyErr.message}`);
      }
    }
  }

  // Mettre à jour les r2_evidence_keys dans legal_evidence_archives
  await supabaseAdmin
    .from("legal_evidence_archives")
    .update({
      archived_by: "cleanup_with_r2_copy"
    })
    .eq("original_user_id", userId);
}

// Supprimer tous les objets R2 sous un préfixe
async function deleteR2Prefix(s3Client: S3Client, bucket: string, prefix: string) {
  let continuationToken: string | undefined;
  
  do {
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    }));

    const objects = listResult.Contents;
    if (objects && objects.length > 0) {
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key })),
          Quiet: true,
        },
      }));
    }

    continuationToken = listResult.NextContinuationToken;
  } while (continuationToken);
}

// Supprimer des clés R2 spécifiques
async function deleteR2Keys(s3Client: S3Client, bucket: string, keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: batch.map((key) => ({ Key: key })),
        Quiet: true,
      },
    }));
  }
}
