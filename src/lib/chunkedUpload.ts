/**
 * Chunked Upload System
 * Upload par morceaux pour fichiers volumineux avec reprise automatique
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
  speed?: string; // ex: "2.5 MB/s"
}

export interface ChunkUploadResult {
  success: boolean;
  filePath: string;
  publicUrl: string;
  error?: string;
}

// Taille des chunks: 5 MB (optimal pour la plupart des connexions)
const CHUNK_SIZE = 5 * 1024 * 1024;

// Nombre de tentatives par chunk
const MAX_RETRIES = 3;

// Délai entre les tentatives (ms)
const RETRY_DELAY = 1000;

/**
 * Upload un fichier par morceaux avec reprise automatique
 */
export async function uploadFileInChunks(
  file: File,
  bucket: string,
  filePath: string,
  onProgress?: (progress: ChunkUploadProgress) => void
): Promise<ChunkUploadResult> {
  const totalBytes = file.size;
  const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
  
  // Pour les petits fichiers (< 10 MB), upload direct
  if (totalBytes < 10 * 1024 * 1024) {
    onProgress?.({
      stage: 'uploading',
      progress: 10,
      message: 'Upload en cours...',
      bytesUploaded: 0,
      totalBytes,
      currentChunk: 1,
      totalChunks: 1,
    });

    const { error } = await supabase.storage.from(bucket).upload(filePath, file);
    
    if (error) {
      return {
        success: false,
        filePath,
        publicUrl: '',
        error: error.message,
      };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    
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
      publicUrl: urlData.publicUrl,
    };
  }

  // Upload par chunks pour les gros fichiers
  onProgress?.({
    stage: 'preparing',
    progress: 0,
    message: `Préparation de ${totalChunks} morceaux...`,
    bytesUploaded: 0,
    totalBytes,
    currentChunk: 0,
    totalChunks,
  });

  const chunks: Blob[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalBytes);
    chunks.push(file.slice(start, end));
  }

  // Upload chaque chunk avec suivi de vitesse
  let bytesUploaded = 0;
  const startTime = Date.now();
  const chunkPaths: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkPath = `${filePath}.chunk${i}`;
    
    let success = false;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
      try {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(chunkPath, chunk, { upsert: true });

        if (error) {
          lastError = new Error(error.message);
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
          }
        } else {
          success = true;
          chunkPaths.push(chunkPath);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Upload error');
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        }
      }
    }

    if (!success) {
      // Nettoyer les chunks uploadés
      await cleanupChunks(bucket, chunkPaths);
      return {
        success: false,
        filePath,
        publicUrl: '',
        error: lastError?.message || 'Échec de l\'upload',
      };
    }

    bytesUploaded += chunk.size;
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = bytesUploaded / elapsed;
    const speedStr = formatSpeed(speed);

    onProgress?.({
      stage: 'uploading',
      progress: Math.round((bytesUploaded / totalBytes) * 90) + 5,
      message: `Chunk ${i + 1}/${totalChunks} • ${speedStr}`,
      bytesUploaded,
      totalBytes,
      currentChunk: i + 1,
      totalChunks,
      speed: speedStr,
    });
  }

  // Assembler les chunks en un seul fichier
  onProgress?.({
    stage: 'finalizing',
    progress: 95,
    message: 'Assemblage du fichier...',
    bytesUploaded: totalBytes,
    totalBytes,
    currentChunk: totalChunks,
    totalChunks,
  });

  try {
    // Télécharger et recombiner les chunks
    const assembledBlob = await assembleChunks(bucket, chunkPaths);
    
    // Upload le fichier final
    const { error: finalError } = await supabase.storage
      .from(bucket)
      .upload(filePath, assembledBlob, { upsert: true });

    if (finalError) {
      await cleanupChunks(bucket, chunkPaths);
      return {
        success: false,
        filePath,
        publicUrl: '',
        error: finalError.message,
      };
    }

    // Nettoyer les chunks
    await cleanupChunks(bucket, chunkPaths);

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Upload terminé!',
      bytesUploaded: totalBytes,
      totalBytes,
      currentChunk: totalChunks,
      totalChunks,
    });

    return {
      success: true,
      filePath,
      publicUrl: urlData.publicUrl,
    };
  } catch (err) {
    await cleanupChunks(bucket, chunkPaths);
    return {
      success: false,
      filePath,
      publicUrl: '',
      error: err instanceof Error ? err.message : 'Erreur d\'assemblage',
    };
  }
}

/**
 * Assembler les chunks téléchargés
 */
async function assembleChunks(bucket: string, chunkPaths: string[]): Promise<Blob> {
  const blobs: Blob[] = [];

  for (const path of chunkPaths) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) {
      throw new Error(`Erreur téléchargement chunk: ${path}`);
    }
    blobs.push(data);
  }

  return new Blob(blobs);
}

/**
 * Nettoyer les chunks temporaires
 */
async function cleanupChunks(bucket: string, chunkPaths: string[]): Promise<void> {
  if (chunkPaths.length === 0) return;
  
  try {
    await supabase.storage.from(bucket).remove(chunkPaths);
  } catch (err) {
    console.warn('Erreur nettoyage chunks:', err);
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
