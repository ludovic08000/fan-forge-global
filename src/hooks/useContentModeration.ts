import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ModerationResult {
  approved: boolean;
  confidence: number;
  category: 'safe' | 'adult' | 'explicit' | 'illegal' | 'rejected' | 'unknown';
  issues: string[];
  flags: {
    possibleMinor: boolean;
    zoophilia: boolean;
    violence: boolean;
    nonConsent: boolean;
    illegalContent: boolean;
    hateSymbols: boolean;
    poorQuality: boolean;
  };
  recommendation: 'approve' | 'manual_review' | 'reject';
  reason: string;
  contentId?: string;
  userId?: string;
  contentType?: string;
  analyzedAt?: string;
  aiModel?: string;
}

export const useContentModeration = () => {
  const [moderating, setModerating] = useState(false);
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);

  const moderateContent = async (
    file: File,
    contentId?: string,
    userId?: string
  ): Promise<ModerationResult | null> => {
    // Only moderate images for now
    if (!file.type.startsWith('image/')) {
      console.log('Skipping moderation for non-image file:', file.type);
      return {
        approved: true,
        confidence: 100,
        category: 'safe',
        issues: [],
        flags: {
          possibleMinor: false,
          zoophilia: false,
          violence: false,
          nonConsent: false,
          illegalContent: false,
          hateSymbols: false,
          poorQuality: false,
        },
        recommendation: 'approve',
        reason: 'Vidéos non analysées automatiquement',
      };
    }

    setModerating(true);
    setModerationResult(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const imageBase64 = await base64Promise;

      // Call moderation edge function
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: {
          action: 'moderate-content',
          imageBase64,
          contentType: file.type,
          contentId,
          userId,
        },
      });

      if (error) {
        console.error('Moderation error:', error);
        toast.warning('Modération automatique indisponible', {
          description: 'Le contenu sera soumis à vérification manuelle',
        });
        
        // Return manual review result on error
        const fallbackResult: ModerationResult = {
          approved: false,
          confidence: 0,
          category: 'unknown',
          issues: ['Service de modération indisponible'],
        flags: {
          possibleMinor: false,
          zoophilia: false,
          violence: false,
          nonConsent: false,
          illegalContent: false,
          hateSymbols: false,
          poorQuality: false,
        },
          recommendation: 'manual_review',
          reason: 'Vérification manuelle requise',
        };
        setModerationResult(fallbackResult);
        return fallbackResult;
      }

      const result = data as ModerationResult;
      setModerationResult(result);

      // Show appropriate toast based on result
      if (result.recommendation === 'reject') {
        toast.error('Contenu rejeté', {
          description: result.reason || 'Ce contenu ne respecte pas les règles de la plateforme',
        });
      } else if (result.recommendation === 'manual_review') {
        toast.warning('Vérification requise', {
          description: result.reason || 'Votre contenu sera vérifié par un modérateur',
        });
      } else if (result.recommendation === 'approve') {
        // Don't show toast for approved content - let the upload flow handle it
      }

      return result;
    } catch (error) {
      console.error('Moderation error:', error);
      toast.warning('Erreur de modération', {
        description: 'Le contenu sera soumis à vérification manuelle',
      });
      
      const fallbackResult: ModerationResult = {
        approved: false,
        confidence: 0,
        category: 'unknown',
        issues: ['Erreur technique'],
        flags: {
          possibleMinor: false,
          zoophilia: false,
          violence: false,
          nonConsent: false,
          illegalContent: false,
          hateSymbols: false,
          poorQuality: false,
        },
        recommendation: 'manual_review',
        reason: 'Vérification manuelle requise',
      };
      setModerationResult(fallbackResult);
      return fallbackResult;
    } finally {
      setModerating(false);
    }
  };

  return {
    moderateContent,
    moderating,
    moderationResult,
  };
};
