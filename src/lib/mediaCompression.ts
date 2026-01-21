/**
 * Media Compression Utilities
 * - Smart image compression with quality preservation
 * - Video compression and optimization
 * - Progress tracking
 */

export interface CompressionProgress {
  stage: 'analyzing' | 'compressing' | 'optimizing' | 'complete' | 'error';
  progress: number;
  message: string;
  originalSize?: number;
  compressedSize?: number;
}

export interface CompressionResult {
  success: boolean;
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  wasCompressed: boolean;
  format: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetSizeKB?: number; // Target file size in KB
  preferWebP?: boolean;
  stripMetadata?: boolean;
}

export interface VideoCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  videoBitrate?: number; // in bps
  audioBitrate?: number; // in bps
  frameRate?: number;
}

const DEFAULT_IMAGE_OPTIONS: ImageCompressionOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.82,
  targetSizeKB: 500, // Target 500KB for images
  preferWebP: true,
  stripMetadata: true,
};

const DEFAULT_VIDEO_OPTIONS: VideoCompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  videoBitrate: 2500000, // 2.5 Mbps
  audioBitrate: 128000, // 128 kbps
  frameRate: 30,
};

/**
 * Check WebP support
 */
const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJYgCdAEO/hOMAA==';
  });
};

/**
 * Load image from file
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
const calculateDimensions = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scaled: boolean } => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height, scaled: false };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
    scaled: true,
  };
};

/**
 * Compress canvas to blob with target size
 */
const compressCanvasToBlob = async (
  canvas: HTMLCanvasElement,
  mimeType: string,
  targetQuality: number,
  targetSizeKB?: number
): Promise<Blob> => {
  let quality = targetQuality;
  let blob: Blob | null = null;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob) break;

    // If no target size or already under target, return
    if (!targetSizeKB || blob.size <= targetSizeKB * 1024) {
      break;
    }

    // Reduce quality and try again
    quality -= 0.1;
    if (quality < 0.3) break; // Don't go below 30% quality
    attempts++;
  }

  if (!blob) {
    throw new Error('Failed to compress image');
  }

  return blob;
};

/**
 * Compress an image file
 */
export const compressImage = async (
  file: File,
  options: Partial<ImageCompressionOptions> = {},
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> => {
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };
  const originalSize = file.size;

  // Skip non-images
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      format: file.type,
      error: 'Not an image file',
    };
  }

  // Skip GIFs (would lose animation)
  if (file.type === 'image/gif') {
    return {
      success: true,
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      format: file.type,
    };
  }

  onProgress?.({
    stage: 'analyzing',
    progress: 10,
    message: 'Analyse de l\'image...',
    originalSize,
  });

  try {
    const img = await loadImage(file);
    
    onProgress?.({
      stage: 'compressing',
      progress: 30,
      message: 'Compression en cours...',
      originalSize,
    });

    // Calculate dimensions
    const { width, height, scaled } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxWidth!,
      opts.maxHeight!
    );

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image (strips EXIF automatically)
    ctx.drawImage(img, 0, 0, width, height);

    onProgress?.({
      stage: 'optimizing',
      progress: 60,
      message: 'Optimisation du format...',
      originalSize,
    });

    // Determine output format
    let mimeType = 'image/jpeg';
    let extension = 'jpg';
    
    if (opts.preferWebP && await supportsWebP()) {
      mimeType = 'image/webp';
      extension = 'webp';
    }

    // Compress with target size
    const blob = await compressCanvasToBlob(
      canvas,
      mimeType,
      opts.quality!,
      opts.targetSizeKB
    );

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Compression terminée!',
      originalSize,
      compressedSize: blob.size,
    });

    // Create new file
    const newFileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
    const compressedFile = new File([blob], newFileName, { type: mimeType });

    // If compressed is larger and we didn't scale, keep original (unless we need to strip metadata)
    if (compressedFile.size >= originalSize && !scaled && !opts.stripMetadata) {
      return {
        success: true,
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
        format: file.type,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    }

    return {
      success: true,
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: originalSize / compressedFile.size,
      wasCompressed: true,
      format: mimeType,
      width,
      height,
    };
  } catch (error) {
    return {
      success: false,
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      format: file.type,
      error: error instanceof Error ? error.message : 'Compression failed',
    };
  }
};

/**
 * Compress a video file
 */
export const compressVideo = async (
  file: File,
  options: Partial<VideoCompressionOptions> = {},
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> => {
  const opts = { ...DEFAULT_VIDEO_OPTIONS, ...options };
  const originalSize = file.size;

  // Skip non-videos
  if (!file.type.startsWith('video/')) {
    return {
      success: false,
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      format: file.type,
      error: 'Not a video file',
    };
  }

  // Check MediaRecorder support
  if (typeof MediaRecorder === 'undefined') {
    return {
      success: false,
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
      wasCompressed: false,
      format: file.type,
      error: 'MediaRecorder not supported',
    };
  }

  onProgress?.({
    stage: 'analyzing',
    progress: 5,
    message: 'Analyse de la vidéo...',
    originalSize,
  });

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve({
        success: false,
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
        format: file.type,
        error: 'Canvas context not available',
      });
      return;
    }

    video.onloadedmetadata = async () => {
      // Calculate dimensions
      const { width, height } = calculateDimensions(
        video.videoWidth,
        video.videoHeight,
        opts.maxWidth!,
        opts.maxHeight!
      );

      canvas.width = width;
      canvas.height = height;

      const duration = video.duration;

      onProgress?.({
        stage: 'compressing',
        progress: 10,
        message: `Compression: 0/${Math.round(duration)}s`,
        originalSize,
      });

      // Choose best supported codec
      let mimeType = 'video/webm;codecs=vp9';
      let extension = 'webm';

      const codecs = [
        { mime: 'video/webm;codecs=vp9', ext: 'webm' },
        { mime: 'video/webm;codecs=vp8', ext: 'webm' },
        { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
      ];

      for (const codec of codecs) {
        if (MediaRecorder.isTypeSupported(codec.mime)) {
          mimeType = codec.mime;
          extension = codec.ext;
          break;
        }
      }

      // Capture canvas stream
      const stream = canvas.captureStream(opts.frameRate!);

      // Try to add audio
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioCtx.destination);
        
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (e) {
        console.log('No audio track or audio error:', e);
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType.split(';')[0],
        videoBitsPerSecond: opts.videoBitrate,
        audioBitsPerSecond: opts.audioBitrate,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        const newFileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
        const compressedFile = new File([blob], newFileName, { type: mimeType.split(';')[0] });

        URL.revokeObjectURL(video.src);

        const compressedSize = compressedFile.size;
        
        onProgress?.({
          stage: 'complete',
          progress: 100,
          message: 'Compression terminée!',
          originalSize,
          compressedSize,
        });

        // Only use compressed version if it's significantly smaller
        if (compressedSize < originalSize * 0.9) {
          resolve({
            success: true,
            file: compressedFile,
            originalSize,
            compressedSize,
            compressionRatio: originalSize / compressedSize,
            wasCompressed: true,
            format: mimeType,
            width,
            height,
          });
        } else {
          resolve({
            success: true,
            file,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1,
            wasCompressed: false,
            format: file.type,
            width: video.videoWidth,
            height: video.videoHeight,
          });
        }
      };

      recorder.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          success: false,
          file,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          wasCompressed: false,
          format: file.type,
          error: 'Recording error',
        });
      };

      // Start recording
      recorder.start(100);

      video.currentTime = 0;

      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);

        const progress = Math.min(95, 10 + (video.currentTime / duration) * 85);
        onProgress?.({
          stage: 'compressing',
          progress,
          message: `Compression: ${Math.round(video.currentTime)}/${Math.round(duration)}s`,
          originalSize,
        });

        requestAnimationFrame(drawFrame);
      };

      video.onended = () => {
        setTimeout(() => recorder.stop(), 100);
      };

      video.play().then(drawFrame).catch((err) => {
        resolve({
          success: false,
          file,
          originalSize,
          compressedSize: originalSize,
          compressionRatio: 1,
          wasCompressed: false,
          format: file.type,
          error: `Playback failed: ${err.message}`,
        });
      });
    };

    video.onerror = () => {
      resolve({
        success: false,
        file,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
        wasCompressed: false,
        format: file.type,
        error: 'Failed to load video',
      });
    };

    video.src = URL.createObjectURL(file);
    video.load();
  });
};

/**
 * Smart compress any media file
 */
export const compressMedia = async (
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> => {
  if (file.type.startsWith('image/')) {
    return compressImage(file, {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.82,
      targetSizeKB: 800,
      preferWebP: true,
    }, onProgress);
  }
  
  if (file.type.startsWith('video/')) {
    return compressVideo(file, {
      maxWidth: 1920,
      maxHeight: 1080,
      videoBitrate: 2500000,
      frameRate: 30,
    }, onProgress);
  }

  return {
    success: false,
    file,
    originalSize: file.size,
    compressedSize: file.size,
    compressionRatio: 1,
    wasCompressed: false,
    format: file.type,
    error: 'Unsupported file type',
  };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Calculate compression savings percentage
 */
export const calculateSavings = (original: number, compressed: number): number => {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
};
