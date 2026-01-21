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
 * Note: L'enregistrement des tentatives se fait maintenant via DB function
 * pour éviter les abus (attaquants ne peuvent plus forger des tentatives échouées)
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
   * Enregistre une tentative de connexion via DB function (sécurisé)
   * Utilise la fonction SQL auto_block_if_needed au lieu de l'edge function
   */
  const recordAttempt = useCallback(async (
    identifier: string, 
    success: boolean,
    attemptType: 'login' | 'password_reset' | '2fa' = 'login'
  ): Promise<BruteForceState> => {
    try {
      // D'abord insérer la tentative via un insert direct (RLS permet l'insert)
      // Puis vérifier si on doit bloquer via la fonction DB
      
      if (!success) {
        // Appeler la fonction DB pour vérifier et bloquer si nécessaire
        const { data: isBlocked, error: blockError } = await supabase
          .rpc('auto_block_if_needed', {
            check_identifier: identifier,
            check_ip: null, // IP gérée côté serveur
            max_attempts: 5,
            block_duration: '30 minutes'
          });

        if (blockError) {
          console.error('Block check error:', blockError);
        }

        // Vérifier l'état de blocage
        const { data: blockData } = await supabase
          .from('security_blocks')
          .select('*')
          .eq('identifier', identifier)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (blockData) {
          const expiresAt = new Date(blockData.expires_at);
          const remainingMinutes = Math.ceil((expiresAt.getTime() - Date.now()) / 60000);
          
          const newState: BruteForceState = {
            blocked: true,
            reason: blockData.reason,
            expiresAt: blockData.expires_at,
            remainingMinutes,
            loading: false,
          };
          setState(newState);
          return newState;
        }

        // Compter les tentatives restantes
        const { count } = await supabase
          .from('login_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('identifier', identifier)
          .eq('success', false)
          .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());

        const remainingAttempts = 5 - (count || 0);
        
        const newState: BruteForceState = {
          blocked: false,
          remainingAttempts: Math.max(0, remainingAttempts),
          warning: remainingAttempts <= 2 ? `Attention: ${remainingAttempts} tentative(s) restante(s)` : undefined,
          loading: false,
        };
        setState(newState);
        return newState;
      }

      // Succès - pas de blocage
      setState({ blocked: false, loading: false });
      return { blocked: false, loading: false };
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
