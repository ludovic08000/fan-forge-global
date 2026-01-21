import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FingerprintRequest {
  fileUrl: string;
  contentId?: string;
  messageId?: string;
  creatorId?: string;
  fileType: 'image' | 'video';
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
  watermarkId?: string;
  watermarkPattern?: string;
}

/**
 * Compute SHA-256 hash of file data
 */
async function computeSHA256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Simple perceptual hash for images
 * Resizes to 8x8 grayscale and computes difference hash
 */
async function computeImagePHash(imageData: Uint8Array): Promise<string | null> {
  try {
    // For a proper pHash, we'd need image processing libraries
    // This is a simplified version using the raw bytes pattern
    // In production, consider using an external service or wasm-based image processing
    
    // Create a hash based on byte patterns (simplified approach)
    const sampleSize = 64; // 8x8
    const step = Math.floor(imageData.length / sampleSize);
    
    if (step < 1) return null;
    
    // Sample bytes at regular intervals
    const samples: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.min(i * step, imageData.length - 1);
      samples.push(imageData[idx]);
    }
    
    // Compute average
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    
    // Create binary hash: 1 if sample > average, 0 otherwise
    let hash = '';
    for (const sample of samples) {
      hash += sample > avg ? '1' : '0';
    }
    
    // Convert binary to hex
    let hexHash = '';
    for (let i = 0; i < hash.length; i += 4) {
      const nibble = hash.slice(i, i + 4).padEnd(4, '0');
      hexHash += parseInt(nibble, 2).toString(16);
    }
    
    return hexHash;
  } catch (error) {
    console.error('pHash computation error:', error);
    return null;
  }
}

/**
 * Basic video fingerprint
 * Samples frames at regular intervals
 */
async function computeVideoFingerprint(videoData: Uint8Array): Promise<string | null> {
  try {
    // Sample video at multiple points to create a fingerprint
    const numSamples = 16;
    const step = Math.floor(videoData.length / numSamples);
    
    if (step < 100) return null;
    
    const samples: number[] = [];
    
    for (let i = 0; i < numSamples; i++) {
      const startIdx = i * step;
      // Take a small window of bytes and compute their sum
      let sum = 0;
      for (let j = 0; j < 100 && startIdx + j < videoData.length; j++) {
        sum += videoData[startIdx + j];
      }
      samples.push(sum % 256);
    }
    
    // Convert to hex fingerprint
    return samples.map(s => s.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Video fingerprint error:', error);
    return null;
  }
}

/**
 * Generate unique watermark ID
 */
function generateWatermarkId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `WM-${timestamp}-${random}`.toUpperCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Use getClaims for JWT validation (works with signing-keys)
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('Claims error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = claimsData.claims.sub;

    const body: FingerprintRequest = await req.json();
    const { 
      fileUrl, 
      contentId, 
      messageId, 
      creatorId,
      fileType, 
      originalFilename, 
      mimeType, 
      fileSize,
      width,
      height,
      duration,
      watermarkId: providedWatermarkId,
      watermarkPattern
    } = body;

    if (!fileUrl || !fileType) {
      return new Response(
        JSON.stringify({ error: 'fileUrl and fileType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contentId && !messageId) {
      return new Response(
        JSON.stringify({ error: 'Either contentId or messageId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Computing fingerprint for ${fileType}: ${fileUrl}`);

    // Fetch the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileData = new Uint8Array(await fileResponse.arrayBuffer());
    console.log(`File fetched: ${fileData.length} bytes`);

    // Compute SHA-256 (always)
    const sha256Hash = await computeSHA256(fileData);
    console.log(`SHA-256: ${sha256Hash}`);

    // Check for exact duplicates
    const { data: existingDuplicate } = await supabaseAdmin.rpc('check_duplicate_hash', {
      p_sha256_hash: sha256Hash
    });

    if (existingDuplicate && existingDuplicate.length > 0) {
      console.log('Exact duplicate found:', existingDuplicate[0]);
      
      // Log the duplicate detection
      const { error: dupError } = await supabaseAdmin
        .from('duplicate_detections')
        .insert({
          original_fingerprint_id: existingDuplicate[0].fingerprint_id,
          detection_type: 'exact',
          similarity_score: 1.0,
          notes: `Exact duplicate uploaded by user ${userId}`
        });
      
      if (dupError) {
        console.error('Error logging duplicate:', dupError);
      }

      return new Response(
        JSON.stringify({ 
          warning: 'duplicate_detected',
          message: 'This exact file has been uploaded before',
          original: existingDuplicate[0]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute perceptual hash for images
    let phash: string | null = null;
    let videoFingerprint: string | null = null;

    if (fileType === 'image') {
      phash = await computeImagePHash(fileData);
      console.log(`pHash: ${phash}`);

      // Check for similar images
      if (phash) {
        const { data: similarImages } = await supabaseAdmin.rpc('find_similar_images', {
          p_phash: phash,
          p_max_distance: 5 // Very similar images
        });

        if (similarImages && similarImages.length > 0) {
          // Filter for close matches (distance < 5 means very similar)
          const closeMatches = similarImages.filter((img: any) => img.distance < 5);
          
          if (closeMatches.length > 0) {
            console.log('Similar images found:', closeMatches);
            // Don't block, just warn
          }
        }
      }
    } else if (fileType === 'video') {
      videoFingerprint = await computeVideoFingerprint(fileData);
      console.log(`Video fingerprint: ${videoFingerprint}`);
    }

    // Generate watermark ID if not provided
    const watermarkId = providedWatermarkId || generateWatermarkId();

    // Get client info from headers
    const uploadIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Store the fingerprint
    const { data: fingerprint, error: insertError } = await supabaseAdmin
      .from('media_fingerprints')
      .insert({
        content_id: contentId || null,
        message_id: messageId || null,
        uploader_id: userId,
        creator_id: creatorId || null,
        phash,
        sha256_hash: sha256Hash,
        video_fingerprint: videoFingerprint,
        watermark_id: watermarkId,
        watermark_pattern: watermarkPattern || null,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize || fileData.length,
        width: width || null,
        height: height || null,
        duration: duration || null,
        original_filename: originalFilename || null,
        mime_type: mimeType || null,
        upload_ip: uploadIp,
        user_agent: userAgent.substring(0, 500)
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store fingerprint', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fingerprint stored successfully:', fingerprint.id);

    return new Response(
      JSON.stringify({
        success: true,
        fingerprint: {
          id: fingerprint.id,
          sha256: sha256Hash,
          phash,
          videoFingerprint,
          watermarkId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
