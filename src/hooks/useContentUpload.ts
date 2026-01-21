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
      setProgress(0);

      // Double validation de sécurité côté hook
      const validationResult = await validateFile(data.file);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || 'Fichier non valide');
      }

      const fileExt = data.file.name.split('.').pop()?.toLowerCase();
      const sanitizedName = validationResult.sanitizedFilename || data.file.name;
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36)}.${fileExt}`;
      
      // Déterminer le type de contenu
      const contentType = data.file.type.startsWith('video/') ? 'video' : 'image';

      let fileToUpload = data.file;

      // Ajouter un filigrane pour les images
      if (contentType === 'image') {
        setProgress(10);
        
        // Récupérer le nom du créateur
        const { data: creatorData } = await supabase
          .from('creators')
          .select('stage_name')
          .eq('id', creatorId)
          .single();

        const creatorName = creatorData?.stage_name || 'Créateur';

        // Convertir l'image en base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(data.file);
        });

        const imageBase64 = await base64Promise;

        // Appeler l'edge function pour ajouter le filigrane
        try {
          const { data: watermarkData, error: watermarkError } = await supabase.functions.invoke('add-watermark', {
            body: { 
              imageBase64,
              creatorName 
            }
          });

          if (watermarkError) {
            console.error('Watermark error:', watermarkError);
            toast.warning('Le filigrane n\'a pas pu être ajouté, l\'image sera uploadée sans protection.');
          } else if (watermarkData?.watermarkedImage) {
            // Convertir le base64 en blob
            const base64Data = watermarkData.watermarkedImage.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: data.file.type });
            fileToUpload = new File([blob], data.file.name, { type: data.file.type });
            
            toast.success('Filigrane ajouté pour protéger votre contenu !');
          }
        } catch (watermarkError) {
          console.error('Watermark processing error:', watermarkError);
          toast.warning('Le filigrane n\'a pas pu être ajouté, l\'image sera uploadée sans protection.');
        }
      }

      // 1. Upload du fichier principal (avec ou sans filigrane)
      setProgress(25);
      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, fileToUpload);

      if (uploadError) {
        throw uploadError;
      }

      setProgress(50);

      // 2. Créer une miniature (pour l'instant on utilise le même fichier pour les images)
      let thumbnailUrl = '';
      if (contentType === 'image') {
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(fileName, fileToUpload);
        
        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(fileName);
          thumbnailUrl = thumbUrlData.publicUrl;
        }
      }

      setProgress(75);

      // 3. Obtenir l'URL du fichier principal
      const { data: fileUrlData } = supabase.storage
        .from('content')
        .getPublicUrl(fileName);

      const fileUrl = fileUrlData.publicUrl;

      // 4. Enregistrer dans la base de données
      const { data: contentData, error: dbError } = await supabase
        .from('content')
        .insert({
          creator_id: creatorId,
          title: data.title,
          description: data.description,
          content_type: contentType,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl || fileUrl,
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

      setProgress(90);

      // 5. Compute and store media fingerprint for security tracking
      try {
        const watermarkId = generateWatermarkId();
        
        const { error: fingerprintError } = await supabase.functions.invoke('compute-media-fingerprint', {
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
        });

        if (fingerprintError) {
          console.warn('Fingerprint computation warning:', fingerprintError);
          // Don't fail the upload, fingerprinting is non-blocking
        } else {
          console.log('Media fingerprint stored successfully');
        }
      } catch (fingerprintError) {
        console.warn('Fingerprint error (non-critical):', fingerprintError);
      }

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