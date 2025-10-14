import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RateLimitResponse {
  allowed: boolean;
  limit: number;
  current: number;
  resetIn: number;
}

/**
 * Hook pour vérifier le rate limiting côté serveur
 */
export const useRateLimitServer = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = async (endpoint: string): Promise<boolean> => {
    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('rate-limit-check', {
        body: { endpoint },
      });

      if (error) throw error;

      const response = data as RateLimitResponse;

      if (!response.allowed) {
        toast.error(
          `Trop de requêtes. Limite: ${response.limit}/min. ` +
          `Réessayez dans ${response.resetIn}s.`,
          { duration: 5000 }
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      // En cas d'erreur, on laisse passer pour ne pas bloquer l'utilisateur
      return true;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkRateLimit,
    isChecking,
  };
};