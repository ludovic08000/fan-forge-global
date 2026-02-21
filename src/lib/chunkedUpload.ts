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

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo',
};

function getContentTypeFromExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_CONTENT_TYPES[ext] || 'application/octet-stream';
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
    console.log('[R2 Upload] Step 1: Getting session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[R2 Upload] Session error:', sessionError);
      throw new Error('Erreur de session: ' + sessionError.message);
    }
    if (!session) {
      console.error('[R2 Upload] No session found');
      throw new Error('Authentification requise');
    }
    console.log('[R2 Upload] Session OK, user:', session.user.id);

    // 2. Get presigned PUT URL from edge function
    console.log('[R2 Upload] Step 2: Calling r2-upload-url edge function...', {
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    });
    
    // Fallback contentType par extension si file.type est vide
    const contentType = file.type || getContentTypeFromExtension(file.name);
    
    const { data, error: fnError } = await supabase.functions.invoke('r2-upload-url', {
      body: {
        fileName: file.name,
        contentType,
        fileSize: file.size,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    console.log('[R2 Upload] Edge function response:', { data, fnError });

    if (fnError || !data?.uploadUrl) {
      console.error('[R2 Upload] Edge function failed:', { fnError, data });
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
