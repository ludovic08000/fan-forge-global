/**
 * Hook pour gérer les signalements de contenu
 * Permet aux utilisateurs de signaler du contenu inapproprié
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReportData {
  contentId: string;
  reason: string;
  description?: string;
}

/**
 * Hook personnalisé pour gérer les signalements de contenu
 */
export const useContentReport = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Soumettre un signalement de contenu
   * @param data - Données du signalement
   */
  const submitReport = async (data: ReportData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Vous devez être connecté pour signaler du contenu');
        return { success: false };
      }

      const { error } = await supabase
        .from('content_reports')
        .insert({
          content_id: data.contentId,
          reporter_id: user.id,
          reason: data.reason,
          description: data.description,
        });

      if (error) throw error;

      toast.success('Signalement envoyé. Merci de nous aider à maintenir la plateforme sûre.');
      return { success: true };
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      toast.error('Erreur lors de l\'envoi du signalement');
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Récupérer les signalements d'un utilisateur
   */
  const getMyReports = async () => {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select(`
          *,
          content:content_id (
            title,
            creator_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération des signalements:', error);
      return { data: null, error };
    }
  };

  return {
    submitReport,
    getMyReports,
    isSubmitting,
  };
};
