/**
 * R2 Direct Upload System
 * Upload direct vers Cloudflare R2 via presigned URLs
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

/**
 * Upload un fichier directement vers R2 via presigned URL
 */
export async function uploadFileInChunks(
  file: File,
  _bucket: string, // Ignoré - tout va sur R2
  _filePath: string, // Ignoré - le serveur génère le path
  onProgress?: (progress: ChunkUploadProgress) => void
): Promise<ChunkUploadResult> {
  const totalBytes = file.size;

  onProgress?.({
    stage: 'preparing',
    progress: 5,
    message: 'Préparation de l\'upload R2...',
    bytesUploaded: 0,
    totalBytes,
    currentChunk: 0,
    totalChunks: 1,
  });

  try {
    // 1. Get session for auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Authentification requise');
    }

    // 2. Get presigned PUT URL from edge function
    const { data, error: fnError } = await supabase.functions.invoke('r2-upload-url', {
      body: {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (fnError || !data?.uploadUrl) {
      throw new Error(data?.error || fnError?.message || 'Erreur obtention URL d\'upload');
    }

    const { uploadUrl, filePath } = data;

    onProgress?.({
      stage: 'uploading',
      progress: 15,
      message: 'Upload en cours...',
      bytesUploaded: 0,
      totalBytes,
      currentChunk: 1,
      totalChunks: 1,
    });

    // 3. Upload directly to R2 via presigned URL with XHR for progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = e.loaded / elapsed;
          const mappedProgress = 15 + Math.round((e.loaded / e.total) * 75);

          onProgress?.({
            stage: 'uploading',
            progress: mappedProgress,
            message: `Upload R2 • ${formatSpeed(speed)}`,
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
          console.error(`[R2 Upload] HTTP ${xhr.status} - Response: ${xhr.responseText}`);
          reject(new Error(`Upload R2 échoué (HTTP ${xhr.status}): ${xhr.responseText?.substring(0, 200)}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Erreur réseau lors de l\'upload R2')));
      xhr.addEventListener('abort', () => reject(new Error('Upload annulé')));

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
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
      filePath, // R2 key returned by the server
      bucket: 'r2', // Marker that this is on R2
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

/**
 * Formater la vitesse d'upload
 */
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytesPerSecond >= 1024) {
    return `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
  }
  return `${bytesPerSecond.toFixed(0)} B/s`;
}

/**
 * Formater la taille de fichier
 */
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
