import React, { useEffect, useState, useMemo } from 'react';
import { useSecureR2Url } from '@/hooks/useSecureR2Url';
import { Skeleton } from '@/components/ui/skeleton';

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
 * Tout le contenu passe par R2 avec URLs signées
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

  // Tout passe par R2 signed URLs maintenant
  const { secureUrl, loading, error } = useSecureR2Url(src, {
    contentId,
    enabled: true,
  });

  // Reset error on URL change
  useEffect(() => {
    setVideoError(false);
  }, [secureUrl]);

  if (loading || !secureUrl) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ minHeight: '300px' }}>
        <Skeleton className="absolute inset-0" />
      </div>
    );
  }

  if (error || videoError) {
    return (
      <div className={`flex items-center justify-center bg-black/80 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <div className="w-12 h-12 rounded-full bg-white/10" />
      </div>
    );
  }

  return (
    <video
      src={secureUrl}
      controls={controls}
      autoPlay={autoPlay}
      className={className}
      playsInline
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      onError={() => setVideoError(true)}
    />
  );
};

export default SecureVideoLightbox;
