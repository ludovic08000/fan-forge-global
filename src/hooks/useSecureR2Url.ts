import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

interface R2UrlCache {
  url: string;
  expiresAt: Date;
}

// Cache global pour les URLs R2 signées
const r2UrlCache = new Map<string, R2UrlCache>();

/**
 * Extrait le chemin du fichier depuis une URL R2 publique
 */
const extractR2FilePath = (url: string): string | null => {
  try {
    // Format: https://pub-xxx.r2.dev/replays/creator_id/filename.mp4
    // ou https://xxx.r2.cloudflarestorage.com/bucket/replays/...
    const urlObj = new URL(url);
    
    // Pour les URLs publiques R2 (pub-xxx.r2.dev)
    if (urlObj.hostname.includes('.r2.dev')) {
      // Le path commence par / donc on enlève le premier caractère
      return urlObj.pathname.substring(1);
    }
    
    // Pour les URLs S3 API (xxx.r2.cloudflarestorage.com)
    if (urlObj.hostname.includes('.r2.cloudflarestorage.com')) {
      // Format: /bucket-name/path/to/file
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        // Enlever le nom du bucket, garder le reste
        return parts.slice(1).join('/');
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Vérifie si une URL est une URL R2 externe
 */
export const isR2Url = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
};

/**
 * Hook pour obtenir des URLs R2 sécurisées avec présignature
 */
export const useSecureR2Url = (
  originalUrl: string | undefined | null,
  options?: {
    contentId?: string;
    enabled?: boolean;
  }
) => {
  const [session, setSession] = useState<Session | null>(null);
  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contentId = options?.contentId;
  const enabled = options?.enabled !== false;

  // Charger la session Supabase directement
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      console.log('[useSecureR2Url] Session loaded:', !!data.session);
      setSession(data.session);
    };
    
    loadSession();
    
    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[useSecureR2Url] Auth state changed:', !!session);
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  /**
   * Vérifier le cache
   */
  const getCachedUrl = useCallback((cacheKey: string): string | null => {
    const cached = r2UrlCache.get(cacheKey);
    if (cached) {
      const now = new Date();
      // Marge de 5 minutes avant expiration
      const expiresWithMargin = new Date(cached.expiresAt.getTime() - 5 * 60 * 1000);
      
      if (now < expiresWithMargin) {
        return cached.url;
      }
      
      r2UrlCache.delete(cacheKey);
    }
    return null;
  }, []);

  /**
   * Obtenir une URL R2 sécurisée
   */
  const fetchSecureUrl = useCallback(async () => {
    console.log('[useSecureR2Url] fetchSecureUrl called:', { originalUrl, enabled, hasSession: !!session });
    
    // Si pas d'URL ou désactivé
    if (!originalUrl || !enabled) {
      console.log('[useSecureR2Url] Disabled or no URL');
      setSecureUrl(originalUrl || null);
      setLoading(false);
      return;
    }

    // Vérifier si c'est une URL R2
    const isR2 = isR2Url(originalUrl);
    console.log('[useSecureR2Url] isR2Url check:', isR2, originalUrl);
    
    if (!isR2) {
      setSecureUrl(originalUrl);
      setLoading(false);
      return;
    }

    const filePath = extractR2FilePath(originalUrl);
    console.log('[useSecureR2Url] Extracted file path:', filePath);
    
    if (!filePath) {
      console.warn('[useSecureR2Url] Could not extract file path from URL:', originalUrl);
      setSecureUrl(originalUrl);
      setLoading(false);
      return;
    }

    // Si pas de session après un délai raisonnable, tenter quand même
    // La session peut arriver après ou l'utilisateur peut être non-connecté
    if (!session) {
      console.log('[useSecureR2Url] No session, trying to get one...');
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        console.warn('[useSecureR2Url] No session available, using public R2 URL as fallback');
        // Pour les URLs publiques R2 (pub-xxx.r2.dev), elles peuvent être accessibles directement
        // Fallback à l'URL originale pour tenter un accès public
        setError('Authentification requise pour contenu premium');
        setSecureUrl(originalUrl);
        setLoading(false);
        return;
      }
      setSession(data.session);
      // La mise à jour de session va relancer fetchSecureUrl via useEffect
      return;
    }

    const cacheKey = `r2:${filePath}:${session.user.id}`;
    
    // Vérifier le cache
    const cached = getCachedUrl(cacheKey);
    if (cached) {
      console.log('[useSecureR2Url] Using cached URL');
      setSecureUrl(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    console.log('[useSecureR2Url] Fetching signed URL for:', filePath);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-replay-url', {
        body: { 
          filePath,
          contentId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;

      if (data?.signedUrl) {
        r2UrlCache.set(cacheKey, {
          url: data.signedUrl,
          expiresAt: new Date(data.expiresAt),
        });
        
        console.log('[useSecureR2Url] Got signed URL successfully');
        setSecureUrl(data.signedUrl);
      } else {
        // Fallback à l'URL originale si pas de signed URL
        console.warn('[useSecureR2Url] No signed URL returned, using original');
        setSecureUrl(originalUrl);
      }
    } catch (err: any) {
      console.error('[useSecureR2Url] Error fetching secure URL:', err);
      setError(err.message);
      // En cas d'erreur, on utilise l'URL originale (peut échouer si bucket privé)
      setSecureUrl(originalUrl);
    } finally {
      setLoading(false);
    }
  }, [originalUrl, session, enabled, contentId, getCachedUrl]);

  useEffect(() => {
    fetchSecureUrl();
  }, [fetchSecureUrl]);

  /**
   * Rafraîchir manuellement l'URL
   */
  const refresh = useCallback(() => {
    if (originalUrl && session) {
      const filePath = extractR2FilePath(originalUrl);
      if (filePath) {
        r2UrlCache.delete(`r2:${filePath}:${session.user.id}`);
      }
    }
    fetchSecureUrl();
  }, [originalUrl, session, fetchSecureUrl]);

  return {
    secureUrl,
    loading,
    error,
    refresh,
    isR2: isR2Url(originalUrl),
  };
};

/**
 * Fonction utilitaire pour invalider le cache R2
 */
export const invalidateR2UrlCache = () => {
  r2UrlCache.clear();
};

/**
 * Fonction utilitaire pour obtenir une URL R2 signée (sans hook)
 */
export const getSecureR2Url = async (
  originalUrl: string,
  contentId?: string
): Promise<string | null> => {
  if (!isR2Url(originalUrl)) {
    return originalUrl;
  }

  const filePath = extractR2FilePath(originalUrl);
  if (!filePath) {
    return originalUrl;
  }

  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      return null;
    }

    const { data, error } = await supabase.functions.invoke('get-replay-url', {
      body: { filePath, contentId },
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
    });

    if (error) throw error;
    return data?.signedUrl || null;
  } catch (err) {
    console.error('[getSecureR2Url] Error:', err);
    return null;
  }
};
