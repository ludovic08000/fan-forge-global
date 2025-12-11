import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BruteForceState {
  blocked: boolean;
  reason?: string;
  expiresAt?: string;
  remainingMinutes?: number;
  remainingAttempts?: number;
  warning?: string;
  loading: boolean;
}

/**
 * Hook pour la protection contre les attaques par force brute
 */
export const useBruteForceProtection = () => {
  const [state, setState] = useState<BruteForceState>({
    blocked: false,
    loading: false,
  });

  /**
   * Vérifie si un identifiant est bloqué avant la connexion
   */
  const checkBeforeLogin = useCallback(async (identifier: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('brute-force-check', {
        body: { action: 'check', identifier }
      });

      if (error) throw error;

      setState({
        blocked: data.blocked,
        reason: data.reason,
        expiresAt: data.expiresAt,
        remainingMinutes: data.remainingMinutes,
        remainingAttempts: data.remainingAttempts,
        loading: false,
      });

      return !data.blocked;
    } catch (err) {
      console.error('Brute force check error:', err);
      // Fail open - permettre la connexion en cas d'erreur
      setState({ blocked: false, loading: false });
      return true;
    }
  }, []);

  /**
   * Enregistre une tentative de connexion
   */
  const recordAttempt = useCallback(async (
    identifier: string, 
    success: boolean,
    attemptType: 'login' | 'password_reset' | '2fa' = 'login'
  ): Promise<BruteForceState> => {
    try {
      const { data, error } = await supabase.functions.invoke('brute-force-check', {
        body: { 
          action: 'record', 
          identifier, 
          success,
          attemptType
        }
      });

      if (error) throw error;

      const newState: BruteForceState = {
        blocked: data.blocked,
        reason: data.reason,
        expiresAt: data.expiresAt,
        remainingMinutes: data.remainingMinutes,
        remainingAttempts: data.remainingAttempts,
        warning: data.warning,
        loading: false,
      };

      setState(newState);
      return newState;
    } catch (err) {
      console.error('Record attempt error:', err);
      return { blocked: false, loading: false };
    }
  }, []);

  /**
   * Réinitialise l'état
   */
  const reset = useCallback(() => {
    setState({ blocked: false, loading: false });
  }, []);

  /**
   * Formate le temps restant pour l'affichage
   */
  const formatRemainingTime = useCallback((): string => {
    if (!state.remainingMinutes) return '';
    
    if (state.remainingMinutes >= 60) {
      const hours = Math.floor(state.remainingMinutes / 60);
      const mins = state.remainingMinutes % 60;
      return `${hours}h ${mins}min`;
    }
    
    return `${state.remainingMinutes} minute${state.remainingMinutes > 1 ? 's' : ''}`;
  }, [state.remainingMinutes]);

  return {
    ...state,
    checkBeforeLogin,
    recordAttempt,
    reset,
    formatRemainingTime,
  };
};
