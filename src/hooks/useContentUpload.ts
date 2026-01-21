import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateFile } from '@/lib/fileValidation';

export interface ContentUploadData {
  title: string;
  description?: string;
  isPremium: boolean;
  isPreview?: boolean;
  price?: number;
  file: File;
  width?: number;
  height?: number;
  skipWatermark?: boolean; // Option to skip watermarking for faster upload
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

  const uploadContent = async (data: ContentUploadData, creatorId: string, userId: string) => {
    try {
      setUploading(true);
      setProgress(5);

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
      
      // Use original file directly - skip watermarking for speed
      // Watermarking can be done async later or on-demand
      const fileToUpload = data.file;

      setProgress(20);

      // Parallel uploads: content + thumbnail (for images)
      const uploadPromises: Promise<any>[] = [];
      
      // Main content upload
      uploadPromises.push(
        supabase.storage.from('content').upload(fileName, fileToUpload)
      );
      
      // Thumbnail upload (same file for images, skip for videos)
      if (contentType === 'image') {
        uploadPromises.push(
          supabase.storage.from('thumbnails').upload(fileName, fileToUpload)
        );
      }

      setProgress(40);

      // Execute uploads in parallel
      const results = await Promise.allSettled(uploadPromises);
      
      // Check main upload result
      const mainUploadResult = results[0];
      if (mainUploadResult.status === 'rejected' || 
          (mainUploadResult.status === 'fulfilled' && mainUploadResult.value.error)) {
        const error = mainUploadResult.status === 'rejected' 
          ? mainUploadResult.reason 
          : mainUploadResult.value.error;
        throw new Error(error.message || 'Erreur upload');
      }

      setProgress(70);

      // Get URLs
      const { data: fileUrlData } = supabase.storage.from('content').getPublicUrl(fileName);
      const fileUrl = fileUrlData.publicUrl;

      let thumbnailUrl = fileUrl; // Default to main file
      if (contentType === 'image' && results[1]?.status === 'fulfilled' && !results[1].value.error) {
        const { data: thumbUrlData } = supabase.storage.from('thumbnails').getPublicUrl(fileName);
        thumbnailUrl = thumbUrlData.publicUrl;
      }

      setProgress(80);

      // Insert to database
      const { data: contentData, error: dbError } = await supabase
        .from('content')
        .insert({
          creator_id: creatorId,
          title: data.title,
          description: data.description,
          content_type: contentType,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
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
          fileUrl: fileUrl,
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
      toast.success('Contenu uploadé avec succès !');
      return contentData;

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload : ' + error.message);
      throw error;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadContent,
    uploading,
    progress
  };
};
