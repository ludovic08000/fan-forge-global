import React, { useEffect, useState } from 'react';
import { useSecureR2Url } from '@/hooks/useSecureR2Url';
import { useAuth } from '@/contexts/AuthContext';
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
 * Inclut un watermark forensique dynamique pour le contenu premium
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
  const { user, userProfile } = useAuth();

  // Tout passe par R2 signed URLs maintenant
  const { secureUrl, loading, error } = useSecureR2Url(src, {
    contentId,
    enabled: true,
  });

  // Reset error on URL change
  useEffect(() => {
    setVideoError(false);
  }, [secureUrl]);

  // Generate watermark text
  const watermarkText = user ? (
    `${userProfile?.username || userProfile?.display_name || user.id.substring(0, 8)} • ${new Date().toLocaleDateString('fr-FR')}`
  ) : '';
  const watermarkId = user?.id?.substring(0, 8) || '';

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
    <div className="relative">
      <video
        src={secureUrl}
        controls={controls}
        autoPlay={autoPlay}
        className={className}
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onError={() => setVideoError(true)}
      />
      
      {/* Dynamic forensic watermark overlay for premium content */}
      {isPremium && user && (
        <div className="absolute inset-0 pointer-events-none select-none z-10" style={{ mixBlendMode: 'difference' }}>
          <div className="absolute top-[10%] left-[6%] opacity-[0.04] text-white text-[10px] font-mono rotate-[-12deg] whitespace-nowrap">
            {watermarkText}
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-white text-[11px] font-mono rotate-[18deg] whitespace-nowrap">
            {watermarkId} • {userProfile?.username || ''}
          </div>
          <div className="absolute bottom-[15%] right-[5%] opacity-[0.04] text-white text-[10px] font-mono rotate-[-6deg] whitespace-nowrap">
            {watermarkId} • {new Date().toISOString().split('T')[0]}
          </div>
          <div className="absolute top-[30%] right-[12%] opacity-[0.025] text-white text-[9px] font-mono rotate-[40deg] whitespace-nowrap">
            {watermarkId}
          </div>
          <div className="absolute bottom-[35%] left-[18%] opacity-[0.025] text-white text-[9px] font-mono rotate-[-25deg] whitespace-nowrap">
            {userProfile?.username || watermarkId}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureVideoLightbox;