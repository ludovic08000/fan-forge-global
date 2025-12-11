import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecureUrlCache {
  url: string;
  expiresAt: Date;
  checksum: string;
}

// Cache global pour les URLs sécurisées
const secureUrlCache = new Map<string, SecureUrlCache>();

/**
 * Génère un checksum pour vérifier l'intégrité de l'URL
 */
const generateChecksum = async (url: string, userId: string): Promise<string> => {
  const data = `${url}:${userId}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

/**
 * Vérifie si une URL est valide et non manipulée
 */
const verifyUrlIntegrity = async (
  originalUrl: string, 
  signedUrl: string, 
  checksum: string,
  userId: string
): Promise<boolean> => {
  try {
    // Vérifier le checksum
    const expectedChecksum = await generateChecksum(originalUrl, userId);
    if (checksum !== expectedChecksum) {
      console.warn('[SecureUrl] Checksum mismatch - possible URL tampering');
      return false;
    }

    // Vérifier que l'URL signée provient bien du domaine Supabase
    const url = new URL(signedUrl);
    if (!url.hostname.endsWith('.supabase.co')) {
      console.warn('[SecureUrl] Invalid URL domain');
      return false;
    }

    // Vérifier la présence du token de signature
    if (!url.searchParams.has('token')) {
      console.warn('[SecureUrl] Missing signature token');
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Hook pour obtenir des URLs sécurisées avec vérification d'intégrité
 */
export const useSecureUrl = (
  originalUrl: string | undefined | null,
  options?: {
    bucket?: string;
    contentId?: string;
    enabled?: boolean;
  }
) => {
  const { user } = useAuth();
  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const bucket = options?.bucket || 'content';
  const contentId = options?.contentId;
  const enabled = options?.enabled !== false;

  /**
   * Extraire le chemin du fichier depuis l'URL
   */
  const extractFilePath = useCallback((url: string): string | null => {
    try {
      const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
      if (match) {
        return match[2];
      }
      
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
   * Vérifier le cache
   */
  const getCachedUrl = useCallback((cacheKey: string): SecureUrlCache | null => {
    const cached = secureUrlCache.get(cacheKey);
    if (cached) {
      const now = new Date();
      const expiresWithMargin = new Date(cached.expiresAt.getTime() - 5 * 60 * 1000);
      
      if (now < expiresWithMargin) {
        return cached;
      }
      
      secureUrlCache.delete(cacheKey);
    }
    return null;
  }, []);

  /**
   * Obtenir une URL sécurisée
   */
  const fetchSecureUrl = useCallback(async () => {
    if (!originalUrl || !user || !enabled) {
      setSecureUrl(originalUrl || null);
      setIsVerified(false);
      return;
    }

    const filePath = extractFilePath(originalUrl);
    if (!filePath) {
      setSecureUrl(originalUrl);
      setIsVerified(false);
      return;
    }

    const cacheKey = `${bucket}:${filePath}:${user.id}`;
    
    // Vérifier le cache
    const cached = getCachedUrl(cacheKey);
    if (cached) {
      // Vérifier l'intégrité de l'URL en cache
      const isValid = await verifyUrlIntegrity(originalUrl, cached.url, cached.checksum, user.id);
      if (isValid) {
        setSecureUrl(cached.url);
        setIsVerified(true);
        return;
      }
      // Si invalide, supprimer du cache
      secureUrlCache.delete(cacheKey);
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
          contentId,
          includeChecksum: true
        },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (fnError) throw fnError;

      if (data?.signedUrl) {
        const checksum = await generateChecksum(originalUrl, user.id);
        
        // Vérifier l'intégrité avant de mettre en cache
        const isValid = await verifyUrlIntegrity(originalUrl, data.signedUrl, checksum, user.id);
        
        if (isValid) {
          secureUrlCache.set(cacheKey, {
            url: data.signedUrl,
            expiresAt: new Date(data.expiresAt),
            checksum,
          });
          
          setSecureUrl(data.signedUrl);
          setIsVerified(true);
        } else {
          throw new Error('URL integrity verification failed');
        }
      } else {
        setSecureUrl(originalUrl);
        setIsVerified(false);
      }
    } catch (err: any) {
      console.error('Error fetching secure URL:', err);
      setError(err.message);
      setSecureUrl(originalUrl);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  }, [originalUrl, user, enabled, bucket, contentId, extractFilePath, getCachedUrl]);

  useEffect(() => {
    fetchSecureUrl();
  }, [fetchSecureUrl]);

  /**
   * Rafraîchir manuellement l'URL
   */
  const refresh = useCallback(() => {
    if (originalUrl && user) {
      const filePath = extractFilePath(originalUrl);
      if (filePath) {
        secureUrlCache.delete(`${bucket}:${filePath}:${user.id}`);
      }
    }
    fetchSecureUrl();
  }, [originalUrl, user, bucket, extractFilePath, fetchSecureUrl]);

  /**
   * Vérifier manuellement l'intégrité de l'URL
   */
  const verifyIntegrity = useCallback(async (): Promise<boolean> => {
    if (!secureUrl || !originalUrl || !user) return false;
    
    const checksum = await generateChecksum(originalUrl, user.id);
    return verifyUrlIntegrity(originalUrl, secureUrl, checksum, user.id);
  }, [secureUrl, originalUrl, user]);

  return {
    secureUrl,
    loading,
    error,
    refresh,
    isVerified,
    verifyIntegrity,
  };
};

/**
 * Fonction utilitaire pour invalider le cache d'URL sécurisées
 */
export const invalidateSecureUrlCache = () => {
  secureUrlCache.clear();
};
