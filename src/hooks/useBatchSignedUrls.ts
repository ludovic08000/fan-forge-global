/**
 * Hook pour précharger les URLs signées en batch
 * Optimise le chargement en faisant une seule requête pour plusieurs fichiers
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSessionAsync } from './useSessionPreload';

interface SignedUrlCache {
  url: string;
  expiresAt: number;
}

// Cache global partagé
const batchUrlCache = new Map<string, SignedUrlCache>();

// Pending batch requests
const pendingBatchKeys = new Set<string>();

/**
 * Vérifie si une URL est un chemin de fichier R2
 */
const isFilePath = (url: string | null): boolean => {
  if (!url) return false;
  // C'est un path si ça ne commence pas par http
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return true;
  }
  // Ou si c'est une URL R2
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
};

/**
 * Extrait le chemin depuis une URL R2
 */
const extractPath = (url: string): string => {
  if (!url.startsWith('http')) return url;
  
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('.r2.dev')) {
      return urlObj.pathname.substring(1);
    }
    if (urlObj.hostname.includes('.r2.cloudflarestorage.com')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      return parts.length > 1 ? parts.slice(1).join('/') : url;
    }
  } catch {}
  return url;
};

/**
 * Récupère depuis le cache
 */
const getCached = (key: string): string | null => {
  const cached = batchUrlCache.get(key);
  if (cached && Date.now() < cached.expiresAt - 300000) {
    return cached.url;
  }
  if (cached) batchUrlCache.delete(key);
  return null;
};

interface FileItem {
  id: string;
  url: string;
  liveStreamId?: string;
  contentId?: string;
}

/**
 * Hook pour obtenir des URLs signées en batch
 * Retourne un Map<id, signedUrl>
 */
export const useBatchSignedUrls = (files: FileItem[]) => {
  const [urlMap, setUrlMap] = useState<Map<string, string>>(() => {
    // Initialiser avec les URLs cachées
    const initial = new Map<string, string>();
    files.forEach(file => {
      if (!isFilePath(file.url)) {
        initial.set(file.id, file.url);
      } else {
        const cached = getCached(`batch:${extractPath(file.url)}`);
        if (cached) initial.set(file.id, cached);
      }
    });
    return initial;
  });
  
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const processedRef = useRef(new Set<string>());

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Compute which files need fetching
  const filesToFetch = useMemo(() => {
    return files.filter(file => {
      if (!isFilePath(file.url)) return false;
      const path = extractPath(file.url);
      const cacheKey = `batch:${path}`;
      // Skip if already cached or being fetched
      if (getCached(cacheKey)) return false;
      if (pendingBatchKeys.has(cacheKey)) return false;
      if (processedRef.current.has(file.id)) return false;
      return true;
    });
  }, [files]);

  useEffect(() => {
    // Update map with cached values for new files
    const updates = new Map<string, string>();
    files.forEach(file => {
      if (!urlMap.has(file.id)) {
        if (!isFilePath(file.url)) {
          updates.set(file.id, file.url);
        } else {
          const cached = getCached(`batch:${extractPath(file.url)}`);
          if (cached) updates.set(file.id, cached);
        }
      }
    });
    
    if (updates.size > 0) {
      setUrlMap(prev => {
        const next = new Map(prev);
        updates.forEach((url, id) => next.set(id, url));
        return next;
      });
    }
  }, [files, urlMap]);

  useEffect(() => {
    if (filesToFetch.length === 0) return;

    const fetchBatch = async () => {
      setLoading(true);
      
      const session = await getSessionAsync();
      if (!session) {
        setLoading(false);
        return;
      }

      // Mark as pending
      const paths = filesToFetch.map(f => ({
        ...f,
        path: extractPath(f.url),
        cacheKey: `batch:${extractPath(f.url)}`
      }));
      
      paths.forEach(p => pendingBatchKeys.add(p.cacheKey));

      try {
        // Fetch each URL (could be optimized with a batch endpoint)
        const results = await Promise.all(
          paths.map(async ({ id, path, cacheKey, liveStreamId, contentId }) => {
            try {
              // Check cache one more time
              const cached = getCached(cacheKey);
              if (cached) return { id, url: cached };

              const { data, error } = await supabase.functions.invoke('get-replay-url', {
                body: { filePath: path, liveStreamId, contentId },
                headers: { Authorization: `Bearer ${session.access_token}` },
              });

              if (error) throw error;

              if (data?.signedUrl) {
                batchUrlCache.set(cacheKey, {
                  url: data.signedUrl,
                  expiresAt: new Date(data.expiresAt).getTime(),
                });
                return { id, url: data.signedUrl };
              }
              return { id, url: null };
            } catch (err) {
              console.error('[useBatchSignedUrls] Error for', path, err);
              return { id, url: null };
            }
          })
        );

        if (mountedRef.current) {
          setUrlMap(prev => {
            const next = new Map(prev);
            results.forEach(({ id, url }) => {
              if (url) {
                next.set(id, url);
                processedRef.current.add(id);
              }
            });
            return next;
          });
        }
      } finally {
        paths.forEach(p => pendingBatchKeys.delete(p.cacheKey));
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchBatch();
  }, [filesToFetch]);

  const getUrl = useCallback((id: string): string | null => {
    return urlMap.get(id) || null;
  }, [urlMap]);

  return {
    urlMap,
    getUrl,
    loading,
    hasUrl: useCallback((id: string) => urlMap.has(id), [urlMap])
  };
};

export default useBatchSignedUrls;
