import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionAsync } from './useSessionPreload';

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

// Cache global pour les URLs signées
const urlCache = new Map<string, SignedUrlCache>();

// Pending requests to deduplicate
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * Extraire le chemin du fichier depuis l'URL
 */
const extractFilePath = (url: string): string | null => {
  try {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    if (match) return match[2];
    
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
    if (pathMatch) return pathMatch[2];

    return null;
  } catch {
    return null;
  }
};

/**
 * Vérifier le cache
 */
const getCachedUrl = (cacheKey: string): string | null => {
  const cached = urlCache.get(cacheKey);
  if (cached) {
    const now = Date.now();
    if (now < cached.expiresAt - 300000) {
      return cached.url;
    }
    urlCache.delete(cacheKey);
  }
  return null;
};

/**
 * Hook optimisé pour URLs signées Supabase
 */
export const useSignedUrl = (
  originalUrl: string | undefined | null,
  options?: {
    bucket?: string;
    contentId?: string;
    enabled?: boolean;
  }
) => {
  const bucket = options?.bucket || 'content';
  const contentId = options?.contentId;
  const enabled = options?.enabled !== false;
  
  const filePath = useMemo(() => 
    originalUrl ? extractFilePath(originalUrl) : null,
    [originalUrl]
  );
  
  const cacheKey = useMemo(() => 
    filePath ? `${bucket}:${filePath}` : null,
    [bucket, filePath]
  );
  
  const cachedUrl = useMemo(() => 
    cacheKey ? getCachedUrl(cacheKey) : null,
    [cacheKey]
  );
  
  const [signedUrl, setSignedUrl] = useState<string | null>(() => {
    if (!originalUrl || !enabled) return originalUrl || null;
    return cachedUrl || null;
  });
  
  const [loading, setLoading] = useState(() => enabled && !!originalUrl && !cachedUrl);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!originalUrl || !enabled) {
      setSignedUrl(originalUrl || null);
      setLoading(false);
      return;
    }

    if (!filePath) {
      setSignedUrl(originalUrl);
      setLoading(false);
      return;
    }

    if (cachedUrl) {
      setSignedUrl(cachedUrl);
      setLoading(false);
      return;
    }

    const fetchUrl = async () => {
      const session = await getSessionAsync();
      
      if (!session) {
        if (mountedRef.current) {
          setError('Auth required');
          setSignedUrl(originalUrl);
          setLoading(false);
        }
        return;
      }

      const key = `${bucket}:${filePath}`;
      
      const cached = getCachedUrl(key);
      if (cached) {
        if (mountedRef.current) {
          setSignedUrl(cached);
          setLoading(false);
        }
        return;
      }

      let pending = pendingRequests.get(key);
      if (!pending) {
        pending = (async () => {
          try {
            const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
              body: { filePath, bucket, contentId },
              headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (fnError) throw fnError;

            if (data?.signedUrl) {
              urlCache.set(key, {
                url: data.signedUrl,
                expiresAt: new Date(data.expiresAt).getTime(),
              });
              return data.signedUrl;
            }
            return null;
          } catch (err) {
            console.error('[useSignedUrl] Error:', err);
            return null;
          } finally {
            pendingRequests.delete(key);
          }
        })();
        pendingRequests.set(key, pending);
      }

      const signed = await pending;
      
      if (mountedRef.current) {
        setSignedUrl(signed || originalUrl);
        setLoading(false);
      }
    };

    setLoading(true);
    fetchUrl();
  }, [originalUrl, enabled, filePath, cachedUrl, bucket, contentId]);

  const refresh = useCallback(() => {
    if (originalUrl) {
      const path = extractFilePath(originalUrl);
      if (path) {
        urlCache.delete(`${bucket}:${path}`);
      }
    }
  }, [originalUrl, bucket]);

  return {
    signedUrl,
    loading,
    error,
    refresh,
    isUsingSignedUrl: signedUrl !== originalUrl
  };
};

/**
 * Fonction utilitaire pour obtenir une URL signée
 */
export const getSignedUrl = async (
  filePath: string,
  bucket: string = 'content',
  contentId?: string
): Promise<string | null> => {
  try {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      return null;
    }

    const { data, error } = await supabase.functions.invoke('get-signed-url', {
      body: { filePath, bucket, contentId },
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`,
      },
    });

    if (error || !data?.signedUrl) {
      return null;
    }

    return data.signedUrl;
  } catch {
    return null;
  }
};
