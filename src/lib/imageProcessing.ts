/**
 * Image Processing Utilities
 * - EXIF stripping
 * - Auto-resize
 * - WebP/AVIF conversion
 */

export interface ProcessedImage {
  file: File;
  originalSize: number;
  processedSize: number;
  width: number;
  height: number;
  format: string;
  exifStripped: boolean;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  preferWebP?: boolean;
  preferAVIF?: boolean;
  stripExif?: boolean;
}

const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  preferWebP: true,
  preferAVIF: false, // AVIF has limited browser support
  stripExif: true,
};

/**
 * Check if browser supports a specific image format
 */
const supportsFormat = (format: 'webp' | 'avif'): Promise<boolean> => {
  return new Promise((resolve) => {
    const testImages: Record<string, string> = {
      webp: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJYgCdAEO/hOMAA==',
      avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgADlAgIGkyCR/wAABAAAAAADQAAA==',
    };
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = testImages[format];
  });
};

/**
 * Load image from file
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculate new dimensions maintaining aspect ratio
 */
const calculateDimensions = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

/**
 * Convert canvas to File with specified format
 */
const canvasToFile = async (
  canvas: HTMLCanvasElement,
  filename: string,
  mimeType: string,
  quality: number
): Promise<File> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const extension = mimeType.split('/')[1];
          const newFilename = filename.replace(/\.[^.]+$/, `.${extension}`);
          resolve(new File([blob], newFilename, { type: mimeType }));
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      mimeType,
      quality
    );
  });
};

/**
 * Get best output format based on browser support and preferences
 */
const getBestFormat = async (options: ImageProcessingOptions): Promise<string> => {
  if (options.preferAVIF && await supportsFormat('avif')) {
    return 'image/avif';
  }
  if (options.preferWebP && await supportsFormat('webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
};

/**
 * Process image: strip EXIF, resize, optimize format
 * Drawing to canvas automatically strips EXIF data
 */
export const processImage = async (
  file: File,
  options: Partial<ImageProcessingOptions> = {}
): Promise<ProcessedImage> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip processing for non-image files
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize: file.size,
      processedSize: file.size,
      width: 0,
      height: 0,
      format: file.type,
      exifStripped: false,
    };
  }

  // Don't process GIFs (would lose animation)
  if (file.type === 'image/gif') {
    return {
      file,
      originalSize: file.size,
      processedSize: file.size,
      width: 0,
      height: 0,
      format: file.type,
      exifStripped: false,
    };
  }

  const img = await loadImage(file);
  const originalSize = file.size;
  
  // Calculate new dimensions
  const { width: newWidth, height: newHeight } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth!,
    opts.maxHeight!
  );

  // Create canvas and draw (this strips EXIF automatically)
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image (no EXIF data is preserved when drawing to canvas)
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Get best output format
  const outputFormat = await getBestFormat(opts);
  
  // Convert to file
  const processedFile = await canvasToFile(
    canvas,
    file.name,
    outputFormat,
    opts.quality!
  );

  // If processed file is larger, use original (unless we need to strip EXIF)
  let finalFile = processedFile;
  if (processedFile.size > originalSize && !opts.stripExif) {
    finalFile = file;
  }

  return {
    file: finalFile,
    originalSize,
    processedSize: finalFile.size,
    width: newWidth,
    height: newHeight,
    format: outputFormat,
    exifStripped: opts.stripExif!,
  };
};

/**
 * Process image for upload with default optimization
 */
export const processImageForUpload = async (file: File): Promise<ProcessedImage> => {
  return processImage(file, {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 0.85,
    preferWebP: true,
    stripExif: true,
  });
};

/**
 * Process image for thumbnail
 */
export const processImageForThumbnail = async (file: File): Promise<ProcessedImage> => {
  return processImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.75,
    preferWebP: true,
    stripExif: true,
  });
};
