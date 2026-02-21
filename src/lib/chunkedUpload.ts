/**
 * R2 Upload System - Direct upload via presigned URL
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChunkUploadProgress {
  stage: 'preparing' | 'uploading' | 'finalizing' | 'complete' | 'error';
  progress: number;
  message: string;
  bytesUploaded: number;
  totalBytes: number;
  currentChunk: number;
  totalChunks: number;
  speed?: string;
}

export interface ChunkUploadResult {
  success: boolean;
  filePath: string;
  bucket: string;
  error?: string;
}

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo',
};

function getContentTypeFromExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_CONTENT_TYPES[ext] || 'application/octet-stream';
}

/**
 * Upload a file to R2 via presigned URL (direct browser → R2)
 */
export async function uploadFileInChunks(
  file: File,
  _bucket: string,
  _filePath: string,
  onProgress?: (progress: ChunkUploadProgress) => void
): Promise<ChunkUploadResult> {
  const totalBytes = file.size;

  onProgress?.({
    stage: 'preparing',
    progress: 5,
    message: 'Préparation de l\'upload...',
    bytesUploaded: 0,
    totalBytes,
    currentChunk: 0,
    totalChunks: 1,
  });

  try {
    // 1. Get session for auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Authentification requise');
    }

    const contentType = file.type || getContentTypeFromExtension(file.name);

    // 2. Get presigned URL from edge function
    const { data, error } = await supabase.functions.invoke('r2-upload-url', {
      body: { fileName: file.name, contentType, fileSize: file.size },
    });

    if (error || !data?.uploadUrl) {
      throw new Error(data?.error || error?.message || 'Impossible d\'obtenir l\'URL d\'upload');
    }

    const { uploadUrl, filePath } = data;

    onProgress?.({
      stage: 'uploading',
      progress: 10,
      message: 'Upload en cours...',
      bytesUploaded: 0,
      totalBytes,
      currentChunk: 1,
      totalChunks: 1,
    });

    // 3. Upload directly to R2 via presigned URL using XHR for progress
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = e.loaded / elapsed;
          const mappedProgress = 10 + Math.round((e.loaded / e.total) * 85);

          onProgress?.({
            stage: 'uploading',
            progress: mappedProgress,
            message: `Upload • ${formatSpeed(speed)}`,
            bytesUploaded: e.loaded,
            totalBytes: e.total,
            currentChunk: 1,
            totalChunks: 1,
            speed: formatSpeed(speed),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload échoué (HTTP ${xhr.status})`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Erreur réseau')));
      xhr.addEventListener('abort', () => reject(new Error('Upload annulé')));

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    });

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Upload terminé!',
      bytesUploaded: totalBytes,
      totalBytes,
      currentChunk: 1,
      totalChunks: 1,
    });

    return {
      success: true,
      filePath,
      bucket: 'r2',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur d\'upload';

    onProgress?.({
      stage: 'error',
      progress: 0,
      message,
      bytesUploaded: 0,
      totalBytes,
      currentChunk: 0,
      totalChunks: 1,
    });

    return {
      success: false,
      filePath: '',
      bucket: 'r2',
      error: message,
    };
  }
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  }
  return `${bytesPerSecond.toFixed(0)} B/s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}
