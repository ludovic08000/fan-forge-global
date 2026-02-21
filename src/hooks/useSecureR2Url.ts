import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionSync, getSessionAsync } from './useSessionPreload';
import type { Session } from '@supabase/supabase-js';

interface R2UrlCache {
  url: string;
  expiresAt: number; // timestamp for faster comparison
}

// Cache global pour les URLs R2 signées - avec expiration de 55 minutes
const r2UrlCache = new Map<string, R2UrlCache>();

// Pending requests to avoid duplicate fetches
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Extrait le chemin du fichier depuis une URL R2 publique ou retourne le chemin direct
 */
const extractR2FilePath = (url: string): string | null => {
  // Si c'est déjà un chemin de fichier (pas une URL), le retourner directement
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('.r2.dev')) {
      return urlObj.pathname.substring(1);
    }
    
    if (urlObj.hostname.includes('.r2.cloudflarestorage.com')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        return parts.slice(1).join('/');
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Vérifie si une URL/path nécessite une URL signée R2
 * Reconnaît: URLs R2 complètes OU chemins de fichiers directs (replays/, content/, etc.)
 */
export const isR2Url = (url: string | null | undefined): boolean => {
  if (!url) return false;
  
  // URLs R2 complètes
  if (url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com')) {
    return true;
  }
  
  // Chemins de fichiers directs (format path-only pour sécurité)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // C'est un chemin de fichier, pas une URL publique - nécessite une URL signée
    return true;
  }
  
  return false;
};

/**
 * Vérifier le cache de manière optimisée
 */
const getCachedUrl = (cacheKey: string): string | null => {
  const cached = r2UrlCache.get(cacheKey);
  if (cached) {
    const now = Date.now();
    // 5 min margin before expiration
    if (now < cached.expiresAt - 300000) {
      return cached.url;
    }
    r2UrlCache.delete(cacheKey);
  }
  return null;
};

/**
 * Hook optimisé pour obtenir des URLs R2 sécurisées
 */
export const useSecureR2Url = (
  originalUrl: string | undefined | null,
  options?: {
    contentId?: string;
    liveStreamId?: string;
    enabled?: boolean;
  }
) => {
  const contentId = options?.contentId;
  const liveStreamId = options?.liveStreamId;
  const enabled = options?.enabled !== false;
  
  const isR2 = useMemo(() => isR2Url(originalUrl), [originalUrl]);
  const filePath = useMemo(() => 
    isR2 && originalUrl ? extractR2FilePath(originalUrl) : null, 
    [isR2, originalUrl]
  );
  
  const cacheKey = useMemo(() => {
    if (!filePath) return null;
    const session = getSessionSync();
    return session ? `r2:${filePath}:${session.user.id}` : `r2:${filePath}:anon`;
  }, [filePath]);
  
  const cachedUrl = useMemo(() => 
    cacheKey ? getCachedUrl(cacheKey) : null,
    [cacheKey]
  );
  
  const [secureUrl, setSecureUrl] = useState<string | null>(() => {
    if (!originalUrl || !enabled) return originalUrl || null;
    if (!isR2) return originalUrl;
    return cachedUrl;
  });
  
  const [loading, setLoading] = useState(() => isR2 && enabled && !cachedUrl);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!originalUrl || !enabled) {
      setSecureUrl(originalUrl || null);
      setLoading(false);
      return;
    }

    if (!isR2) {
      setSecureUrl(originalUrl);
      setLoading(false);
      return;
    }

    if (!filePath) {
      setSecureUrl(originalUrl);
      setLoading(false);
      return;
    }

    if (cachedUrl) {
      setSecureUrl(cachedUrl);
      setLoading(false);
      return;
    }

    const fetchUrl = async () => {
      const session = await getSessionAsync();
      
      if (!session) {
        if (mountedRef.current) {
          setError('Auth required');
          setSecureUrl(null);
          setLoading(false);
        }
        return;
      }

      const key = `r2:${filePath}:${session.user.id}`;
      
      const cached = getCachedUrl(key);
      if (cached) {
        if (mountedRef.current) {
          setSecureUrl(cached);
          setLoading(false);
        }
        return;
      }

      let pending = pendingRequests.get(key);
      if (!pending) {
        pending = (async () => {
          try {
            // Use get-replay-url which validates access rights in DB
            // and returns a short-lived presigned URL (works in <img>/<video> without CORS)
            const { data, error: fnError } = await supabase.functions.invoke('get-replay-url', {
              body: { filePath, contentId, liveStreamId },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (fnError) throw fnError;

            const signedUrl = data?.url || data?.signedUrl;
            if (signedUrl) {
              r2UrlCache.set(key, {
                url: signedUrl,
                expiresAt: data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 3600000,
              });
              return signedUrl;
            }
            
            return null;
          } catch (err) {
            console.error('[useSecureR2Url] Error:', err);
            return null;
          } finally {
            pendingRequests.delete(key);
          }
        })();
        pendingRequests.set(key, pending);
      }

      const signedUrl = await pending;
      
      if (mountedRef.current) {
        setSecureUrl(signedUrl || null);
        setLoading(false);
        if (!signedUrl) setError('Failed to get signed URL');
      }
    };

    setLoading(true);
    fetchUrl();
  }, [originalUrl, enabled, isR2, filePath, cachedUrl, contentId, liveStreamId]);

  const refresh = useCallback(async () => {
    if (originalUrl) {
      const path = extractR2FilePath(originalUrl);
      if (path) {
        const session = await getSessionAsync();
        if (session) {
          const key = `r2:${path}:${session.user.id}`;
          r2UrlCache.delete(key);
        }
      }
    }
  }, [originalUrl]);

  return {
    secureUrl,
    loading,
    error,
    refresh,
    isR2: isR2Url(originalUrl),
  };
};

/**
 * Pre-fill cache with a known signed URL (e.g. after upload)
 */
export const prefillR2UrlCache = (filePath: string, signedUrl: string, expiresAt: string) => {
  // Use a generic cache key (without user ID) that will be found by getCachedUrl
  const key = `r2:${filePath}:anon`;
  r2UrlCache.set(key, {
    url: signedUrl,
    expiresAt: new Date(expiresAt).getTime(),
  });
  
  // Also try to set with current user session
  const session = getSessionSync();
  if (session) {
    r2UrlCache.set(`r2:${filePath}:${session.user.id}`, {
      url: signedUrl,
      expiresAt: new Date(expiresAt).getTime(),
    });
  }
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
    return data?.url || data?.signedUrl || null;
  } catch (err) {
    console.error('[getSecureR2Url] Error:', err);
    return null;
  }
};
