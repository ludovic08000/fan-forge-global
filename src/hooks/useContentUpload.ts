import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateFile } from '@/lib/fileValidation';
import { uploadFileInChunks, ChunkUploadProgress } from '@/lib/chunkedUpload';

export interface ContentUploadData {
  title: string;
  description?: string;
  isPremium: boolean;
  isPreview?: boolean;
  price?: number;
  file: File;
  width?: number;
  height?: number;
  skipWatermark?: boolean;
}

/**
 * Generate a unique watermark ID for content tracking
 */
const generateWatermarkId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `WM-${timestamp}-${random}`.toUpperCase();
};

export const useContentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [uploadSpeed, setUploadSpeed] = useState<string>('');

  const uploadContent = async (data: ContentUploadData, creatorId: string, userId: string) => {
    try {
      setUploading(true);
      setProgress(5);
      setUploadStage('Validation...');

      // Quick validation (skip extension check for processed files)
      const validationResult = await validateFile(data.file, true);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || 'Fichier non valide');
      }

      setProgress(10);

      // Prepare file info
      const fileExt = validationResult.sanitizedFilename?.split('.').pop()?.toLowerCase() || 
                      data.file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const contentType = data.file.type.startsWith('video/') ? 'video' : 'image';
      
      // Upload direct sans compression (la compression vidéo client-side cause des désync audio)
      const fileToUpload = data.file;

      setProgress(30);
      setUploadStage('Upload en cours...');

      // Upload avec chunks pour gros fichiers
      const uploadResult = await uploadFileInChunks(
        fileToUpload,
        'content',
        fileName,
        (p: ChunkUploadProgress) => {
          // Map chunk progress (0-100) to overall progress (30-85)
          const mappedProgress = 30 + Math.round(p.progress * 0.55);
          setProgress(mappedProgress);
          setUploadStage(p.message);
          if (p.speed) {
            setUploadSpeed(p.speed);
          }
        }
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Erreur upload');
      }

      setProgress(85);
      setUploadStage('Finalisation...');

      // Stocker le filePath R2
      const storagePath = filePath;
      let thumbnailPath = storagePath;

      setProgress(90);

      // Insert to database - stocker le filePath, pas l'URL publique
      const { data: contentData, error: dbError } = await supabase
        .from('content')
        .insert({
          creator_id: creatorId,
          title: data.title,
          description: data.description,
          content_type: contentType,
          file_url: storagePath, // filePath au lieu de publicUrl
          thumbnail_url: thumbnailPath,
          is_premium: data.isPremium,
          is_preview: data.isPreview || false,
          price: data.isPremium ? (data.price || 0) : 0,
          file_size: fileToUpload.size,
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      setProgress(95);

      // Fire-and-forget: fingerprint computation (don't wait)
      const watermarkId = generateWatermarkId();
      supabase.functions.invoke('compute-media-fingerprint', {
        body: {
          filePath: storagePath,
          bucket: bucket,
          contentId: contentData.id,
          creatorId: creatorId,
          fileType: contentType,
          originalFilename: data.file.name,
          mimeType: data.file.type,
          fileSize: fileToUpload.size,
          width: data.width,
          height: data.height,
          watermarkId: watermarkId,
        }
      }).catch(err => console.warn('Fingerprint error (non-critical):', err));

      setProgress(100);
      setUploadStage('Terminé!');
      toast.success('Contenu uploadé avec succès !');
      return contentData;

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload : ' + error.message);
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadStage('');
      setUploadSpeed('');
    }
  };

  return {
    uploadContent,
    uploading,
    progress,
    uploadStage,
    uploadSpeed
  };
};
