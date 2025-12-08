import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SignedUrlCache {
  url: string;
  expiresAt: Date;
}

// Cache global pour les URLs signées
const urlCache = new Map<string, SignedUrlCache>();

/**
 * Hook pour obtenir des URLs signées avec expiration pour le contenu protégé
 */
export const useSignedUrl = (
  originalUrl: string | undefined | null,
  options?: {
    bucket?: string;
    contentId?: string;
    enabled?: boolean;
  }
) => {
  const { user } = useAuth();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bucket = options?.bucket || 'content';
  const contentId = options?.contentId;
  const enabled = options?.enabled !== false;

  /**
   * Extraire le chemin du fichier depuis l'URL publique
   */
  const extractFilePath = useCallback((url: string): string | null => {
    try {
      // Format: https://xxx.supabase.co/storage/v1/object/public/bucket/path/to/file
      const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
      if (match) {
        return match[2]; // Retourne le chemin après le bucket
      }
      
      // Si c'est déjà une URL signée, extraire le chemin
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
      if (pathMatch) {
        return pathMatch[2];
      }

      return null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Vérifier si l'URL en cache est encore valide
   */
  const getCachedUrl = useCallback((cacheKey: string): string | null => {
    const cached = urlCache.get(cacheKey);
    if (cached) {
      // Vérifier si l'URL n'a pas expiré (avec 5 minutes de marge)
      const now = new Date();
      const expiresWithMargin = new Date(cached.expiresAt.getTime() - 5 * 60 * 1000);
      
      if (now < expiresWithMargin) {
        return cached.url;
      }
      
      // URL expirée, la supprimer du cache
      urlCache.delete(cacheKey);
    }
    return null;
  }, []);

  /**
   * Obtenir une URL signée
   */
  const fetchSignedUrl = useCallback(async () => {
    if (!originalUrl || !user || !enabled) {
      setSignedUrl(originalUrl || null);
      return;
    }

    const filePath = extractFilePath(originalUrl);
    if (!filePath) {
      // Si on ne peut pas extraire le chemin, utiliser l'URL originale
      setSignedUrl(originalUrl);
      return;
    }

    const cacheKey = `${bucket}:${filePath}`;
    
    // Vérifier le cache
    const cachedUrl = getCachedUrl(cacheKey);
    if (cachedUrl) {
      setSignedUrl(cachedUrl);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
        body: { 
          filePath, 
          bucket,
          contentId 
        },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.signedUrl) {
        // Mettre en cache
        urlCache.set(cacheKey, {
          url: data.signedUrl,
          expiresAt: new Date(data.expiresAt)
        });
        
        setSignedUrl(data.signedUrl);
      } else {
        // Fallback à l'URL originale
        setSignedUrl(originalUrl);
      }
    } catch (err: any) {
      console.error('Error fetching signed URL:', err);
      setError(err.message);
      // En cas d'erreur, utiliser l'URL originale
      setSignedUrl(originalUrl);
    } finally {
      setLoading(false);
    }
  }, [originalUrl, user, enabled, bucket, contentId, extractFilePath, getCachedUrl]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  /**
   * Rafraîchir manuellement l'URL signée
   */
  const refresh = useCallback(() => {
    if (originalUrl) {
      const filePath = extractFilePath(originalUrl);
      if (filePath) {
        urlCache.delete(`${bucket}:${filePath}`);
      }
    }
    fetchSignedUrl();
  }, [originalUrl, bucket, extractFilePath, fetchSignedUrl]);

  return {
    signedUrl,
    loading,
    error,
    refresh,
    isUsingSignedUrl: signedUrl !== originalUrl
  };
};

/**
 * Fonction utilitaire pour obtenir une URL signée de manière ponctuelle
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
