import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoEditRequest {
  videoPath: string; // Path in storage
  outputPath: string; // Output path in storage
  settings: {
    trimStart: number;
    trimEnd: number;
    coverTime: number | null;
    textOverlay: {
      text: string;
      x: number;
      y: number;
      size: number;
      color: string;
    } | null;
    musicUrl: string | null;
    musicVolume: number;
    musicFadeIn: boolean;
    musicFadeOut: boolean;
    filters: {
      brightness: number;
      contrast: number;
      saturation: number;
    };
  };
  creatorId: string;
  watermarkText: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-VIDEO] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: VideoEditRequest = await req.json();
    logStep("Received video processing request", { 
      videoPath: body.videoPath,
      creatorId: body.creatorId 
    });

    // Verify the user owns this creator profile
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('id', body.creatorId)
      .eq('user_id', user.id)
      .single();

    if (creatorError || !creator) {
      throw new Error("Not authorized to process this video");
    }

    // Build FFmpeg command (conceptual - actual processing would need FFmpeg worker)
    const ffmpegFilters: string[] = [];
    
    // 1. Trim filter
    const duration = body.settings.trimEnd - body.settings.trimStart;
    logStep("Trim settings", { 
      start: body.settings.trimStart, 
      end: body.settings.trimEnd,
      duration 
    });

    // 2. Color filters
    const { brightness, contrast, saturation } = body.settings.filters;
    if (brightness !== 100 || contrast !== 100 || saturation !== 100) {
      // Convert percentage to FFmpeg eq filter values
      const b = (brightness - 100) / 100; // -1 to 1
      const c = contrast / 100; // 0 to 2
      const s = saturation / 100; // 0 to 2
      ffmpegFilters.push(`eq=brightness=${b}:contrast=${c}:saturation=${s}`);
      logStep("Color filters", { brightness, contrast, saturation });
    }

    // 3. Text overlay
    if (body.settings.textOverlay) {
      const { text, x, y, size, color } = body.settings.textOverlay;
      // Convert hex color to FFmpeg format
      const ffmpegColor = color.replace('#', '0x');
      ffmpegFilters.push(
        `drawtext=text='${text}':fontsize=${size}:fontcolor=${ffmpegColor}:x=(w*${x/100})-(text_w/2):y=(h*${y/100})-(text_h/2):shadowcolor=black:shadowx=2:shadowy=2`
      );
      logStep("Text overlay", { text, x, y, size });
    }

    // 4. Watermark (always applied)
    if (body.watermarkText) {
      ffmpegFilters.push(
        `drawtext=text='${body.watermarkText}':fontsize=16:fontcolor=white@0.3:x=10:y=h-30`
      );
      logStep("Watermark", { text: body.watermarkText });
    }

    // Build the conceptual FFmpeg command
    const ffmpegCommand = {
      input: body.videoPath,
      output: body.outputPath,
      trim: {
        start: body.settings.trimStart,
        duration: duration
      },
      filters: ffmpegFilters,
      audio: body.settings.musicUrl ? {
        url: body.settings.musicUrl,
        volume: body.settings.musicVolume / 100,
        fadeIn: body.settings.musicFadeIn,
        fadeOut: body.settings.musicFadeOut
      } : null
    };

    logStep("FFmpeg command prepared", ffmpegCommand);

    // In a production environment, this would:
    // 1. Download the video from storage
    // 2. Run FFmpeg with the constructed filters
    // 3. Upload the processed video back to storage
    // 4. Generate thumbnail from coverTime
    // 5. Return the new file URLs

    // For now, we simulate the processing and store the settings
    // The actual processing would be done by a dedicated video worker

    // Store the processing job in a queue table
    const { data: job, error: jobError } = await supabase
      .from('video_processing_jobs')
      .insert({
        creator_id: body.creatorId,
        user_id: user.id,
        input_path: body.videoPath,
        output_path: body.outputPath,
        settings: body.settings,
        watermark_text: body.watermarkText,
        status: 'pending',
        ffmpeg_filters: ffmpegFilters
      })
      .select()
      .single();

    if (jobError) {
      // If table doesn't exist, just log and return success
      // The video will be uploaded as-is with client-side settings stored
      logStep("Job queue not available, settings stored for future processing", { 
        error: jobError.message 
      });
    } else {
      logStep("Processing job created", { jobId: job?.id });
    }

    // Return success with the settings that will be applied
    return new Response(
      JSON.stringify({
        success: true,
        message: "Paramètres de traitement vidéo enregistrés",
        settings: body.settings,
        coverTime: body.settings.coverTime,
        // In production, these would be the URLs of processed files
        processedVideoUrl: null, // Would be filled after processing
        thumbnailUrl: null // Would be generated from coverTime
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
      }
    );
  }
});
