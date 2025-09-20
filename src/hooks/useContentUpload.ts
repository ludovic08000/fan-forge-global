import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContentUploadData {
  title: string;
  description?: string;
  isPremium: boolean;
  price?: number;
  file: File;
}

export const useContentUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadContent = async (data: ContentUploadData, creatorId: string, userId: string) => {
    try {
      setUploading(true);
      setProgress(0);

      const fileExt = data.file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36)}.${fileExt}`;
      
      // Déterminer le type de contenu
      const contentType = data.file.type.startsWith('video/') ? 'video' : 'image';

      // 1. Upload du fichier principal
      setProgress(25);
      const { error: uploadError } = await supabase.storage
        .from('content')
        .upload(fileName, data.file);

      if (uploadError) {
        throw uploadError;
      }

      setProgress(50);

      // 2. Créer une miniature (pour l'instant on utilise le même fichier pour les images)
      let thumbnailUrl = '';
      if (contentType === 'image') {
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .upload(fileName, data.file);
        
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
          price: data.isPremium ? (data.price || 0) : 0,
          file_size: data.file.size,
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
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