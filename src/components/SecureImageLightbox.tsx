import React, { useState } from 'react';
import { useSecureR2Url } from '@/hooks/useSecureR2Url';
import { Skeleton } from '@/components/ui/skeleton';

interface SecureImageLightboxProps {
  src: string;
  contentId: string;
  alt?: string;
  className?: string;
}

/**
 * Image sécurisée pour lightbox — résout l'URL R2 via signed URL
 */
export const SecureImageLightbox: React.FC<SecureImageLightboxProps> = ({
  src,
  contentId,
  alt = 'Image',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const { secureUrl, loading, error } = useSecureR2Url(src, {
    contentId,
    enabled: true,
  });

  if (loading || !secureUrl) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ minHeight: '300px', minWidth: '300px' }}>
        <Skeleton className="absolute inset-0" />
      </div>
    );
  }

  if (error || imgError) {
    return (
      <div className={`flex items-center justify-center bg-black/80 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <div className="w-12 h-12 rounded-full bg-white/10" />
      </div>
    );
  }

  return (
    <img
      src={secureUrl}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
    />
  );
};

export default SecureImageLightbox;
