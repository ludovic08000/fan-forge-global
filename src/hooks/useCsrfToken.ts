import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CsrfState {
  token: string | null;
  expiresAt: Date | null;
  loading: boolean;
  error: string | null;
}

// Cache global pour le token CSRF
let cachedToken: { token: string; expiresAt: Date } | null = null;

/**
 * Hook pour gérer les tokens CSRF pour la protection contre les attaques CSRF
 */
export const useCsrfToken = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CsrfState>({
    token: cachedToken?.token || null,
    expiresAt: cachedToken?.expiresAt || null,
    loading: false,
    error: null,
  });

  /**
   * Vérifie si le token en cache est encore valide
   */
  const isTokenValid = useCallback((): boolean => {
    if (!cachedToken) return false;
    
    // Considérer le token invalide 5 minutes avant son expiration
    const now = new Date();
    const expiresWithMargin = new Date(cachedToken.expiresAt.getTime() - 5 * 60 * 1000);
    
    return now < expiresWithMargin;
  }, []);

  /**
   * Génère un nouveau token CSRF
   */
  const generateToken = useCallback(async (): Promise<string | null> => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }));
      return null;
    }

    // Si le token en cache est valide, le retourner
    if (isTokenValid() && cachedToken) {
      setState(prev => ({ 
        ...prev, 
        token: cachedToken!.token,
        expiresAt: cachedToken!.expiresAt 
      }));
      return cachedToken.token;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('csrf-token', {
        body: { action: 'generate' },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.token) {
        const expiresAt = new Date(data.expiresAt);
        cachedToken = { token: data.token, expiresAt };
        
        setState({
          token: data.token,
          expiresAt,
          loading: false,
          error: null,
        });
        
        return data.token;
      }

      throw new Error('No token received');
    } catch (err: any) {
      console.error('Error generating CSRF token:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
      return null;
    }
  }, [user, isTokenValid]);

  /**
   * Vérifie un token CSRF
   */
  const verifyToken = useCallback(async (tokenToVerify?: string): Promise<boolean> => {
    const token = tokenToVerify || state.token;
    
    if (!token || !user) {
      return false;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        return false;
      }

      const { data, error } = await supabase.functions.invoke('csrf-token', {
        body: { action: 'verify', csrfToken: token },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (error) return false;

      return data?.valid === true;
    } catch {
      return false;
    }
  }, [user, state.token]);

  /**
   * Invalide le token en cache
   */
  const invalidateToken = useCallback(() => {
    cachedToken = null;
    setState({
      token: null,
      expiresAt: null,
      loading: false,
      error: null,
    });
  }, []);

  // Générer automatiquement un token au montage si l'utilisateur est connecté
  useEffect(() => {
    if (user && !isTokenValid()) {
      generateToken();
    }
  }, [user, generateToken, isTokenValid]);

  // Rafraîchir le token avant expiration
  useEffect(() => {
    if (!state.expiresAt) return;

    const refreshTime = state.expiresAt.getTime() - Date.now() - 5 * 60 * 1000;
    
    if (refreshTime > 0) {
      const timeout = setTimeout(() => {
        generateToken();
      }, refreshTime);

      return () => clearTimeout(timeout);
    }
  }, [state.expiresAt, generateToken]);

  return {
    token: state.token,
    expiresAt: state.expiresAt,
    loading: state.loading,
    error: state.error,
    generateToken,
    verifyToken,
    invalidateToken,
    isValid: isTokenValid(),
  };
};

/**
 * HOC pour ajouter la protection CSRF à une fonction
 */
export const withCsrfProtection = async <T,>(
  csrfToken: string | null,
  action: () => Promise<T>
): Promise<T> => {
  if (!csrfToken) {
    throw new Error('CSRF token required');
  }
  
  return action();
};
