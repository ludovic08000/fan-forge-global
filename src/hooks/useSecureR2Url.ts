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
 * Extrait le chemin du fichier depuis une URL R2 publique (memoized)
 */
const extractR2FilePath = (url: string): string | null => {
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
 * Vérifie si une URL est une URL R2 externe
 */
export const isR2Url = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
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
    enabled?: boolean;
  }
) => {
  const contentId = options?.contentId;
  const enabled = options?.enabled !== false;
  
  // Check if R2 URL synchronously to avoid unnecessary state updates
  const isR2 = useMemo(() => isR2Url(originalUrl), [originalUrl]);
  const filePath = useMemo(() => 
    isR2 && originalUrl ? extractR2FilePath(originalUrl) : null, 
    [isR2, originalUrl]
  );
  
  // Compute cache key once
  const cacheKey = useMemo(() => {
    if (!filePath) return null;
    const session = getSessionSync();
    return session ? `r2:${filePath}:${session.user.id}` : `r2:${filePath}:anon`;
  }, [filePath]);
  
  // Check cache synchronously for instant display
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
    // Fast path: no URL, disabled, or not R2
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

    // Already cached
    if (cachedUrl) {
      setSecureUrl(cachedUrl);
      setLoading(false);
      return;
    }

    // Need to fetch
    const fetchUrl = async () => {
      const session = await getSessionAsync();
      
      if (!session) {
        if (mountedRef.current) {
          setError('Auth required');
          setSecureUrl(originalUrl);
          setLoading(false);
        }
        return;
      }

      const key = `r2:${filePath}:${session.user.id}`;
      
      // Check cache again after async
      const cached = getCachedUrl(key);
      if (cached) {
        if (mountedRef.current) {
          setSecureUrl(cached);
          setLoading(false);
        }
        return;
      }

      // Check if already fetching
      let pending = pendingRequests.get(key);
      if (!pending) {
        pending = (async () => {
          try {
            const { data, error: fnError } = await supabase.functions.invoke('get-replay-url', {
              body: { filePath, contentId },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (fnError) throw fnError;

            if (data?.signedUrl) {
              r2UrlCache.set(key, {
                url: data.signedUrl,
                expiresAt: new Date(data.expiresAt).getTime(),
              });
              return data.signedUrl;
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
        setSecureUrl(signedUrl || originalUrl);
        setLoading(false);
      }
    };

    setLoading(true);
    fetchUrl();
  }, [originalUrl, enabled, isR2, filePath, cachedUrl, contentId]);

  const refresh = useCallback(async () => {
    if (originalUrl) {
      const path = extractR2FilePath(originalUrl);
      if (path) {
        const session = await getSessionAsync();
        if (session) {
          r2UrlCache.delete(`r2:${path}:${session.user.id}`);
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
