import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface SecureVideoLightboxProps {
  src: string;
  contentId: string;
  isPremium?: boolean;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
}

/**
 * Composant vidéo sécurisé pour les lightbox/modals
 * Utilise des URLs signées pour les vidéos R2 et Supabase premium
 */
export const SecureVideoLightbox: React.FC<SecureVideoLightboxProps> = ({
  src,
  contentId,
  isPremium = false,
  className = '',
  autoPlay = true,
  controls = true,
}) => {
  const [videoError, setVideoError] = useState(false);

  // Détecter si c'est une URL R2 externe (bucket privé)
  const isExternalR2 = isR2Url(src);

  // Hook pour URLs R2 sécurisées (Cloudflare) - bucket PRIVÉ
  const { secureUrl: r2SecureUrl, loading: r2Loading, error: r2Error } = useSecureR2Url(
    isExternalR2 ? src : null,
    {
      contentId,
      enabled: isExternalR2
    }
  );

  // Hook pour URLs Supabase signées (contenu premium)
  const needsSignedUrl = !isExternalR2 && isPremium;
  const { signedUrl: supabaseSignedUrl, loading: supabaseLoading } = useSignedUrl(
    needsSignedUrl ? src : null,
    {
      bucket: 'content',
      contentId,
      enabled: needsSignedUrl
    }
  );

  // URL sécurisée finale
  const getSecureUrl = (): string => {
    if (isExternalR2) {
      if (r2SecureUrl) {
        console.log('[SecureVideoLightbox] Using R2 signed URL');
        return r2SecureUrl;
      }
      console.log('[SecureVideoLightbox] Waiting for R2 signed URL');
      return '';
    } else if (isPremium && supabaseSignedUrl) {
      console.log('[SecureVideoLightbox] Using Supabase signed URL');
      return supabaseSignedUrl;
    }
    console.log('[SecureVideoLightbox] Using direct URL');
    return src;
  };

  const secureVideoUrl = getSecureUrl();
  const isLoading = isExternalR2 ? (r2Loading && !r2SecureUrl) : (isPremium ? supabaseLoading : false);

  // Reset error on URL change
  useEffect(() => {
    setVideoError(false);
  }, [secureVideoUrl]);

  // Debug log
  useEffect(() => {
    console.log('[SecureVideoLightbox] State:', {
      src: src?.substring(0, 60),
      isExternalR2,
      r2SecureUrl: r2SecureUrl?.substring(0, 60),
      r2Loading,
      r2Error,
      secureVideoUrl: secureVideoUrl?.substring(0, 60),
      isLoading
    });
  }, [src, isExternalR2, r2SecureUrl, r2Loading, r2Error, secureVideoUrl, isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-black/50 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2" />
          <p className="text-sm">Chargement sécurisé...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (r2Error || videoError) {
    return (
      <div className={`flex items-center justify-center bg-black/50 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <div className="text-center text-white">
          <p className="text-red-400 mb-2">Erreur de chargement</p>
          <p className="text-sm text-white/60">{r2Error || 'Impossible de charger la vidéo'}</p>
        </div>
      </div>
    );
  }

  // No URL available yet
  if (!secureVideoUrl) {
    return (
      <div className={`flex items-center justify-center bg-black/50 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <video
      src={secureVideoUrl}
      controls={controls}
      autoPlay={autoPlay}
      className={className}
      playsInline
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      onError={(e) => {
        console.error('[SecureVideoLightbox] Video error:', e);
        setVideoError(true);
      }}
    />
  );
};

export default SecureVideoLightbox;
