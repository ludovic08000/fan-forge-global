import { useState, useEffect } from 'react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock } from 'lucide-react';

interface SecureImageProps {
  src: string | undefined | null;
  alt: string;
  className?: string;
  contentId?: string;
  isPremium?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Composant d'image sécurisée utilisant des URLs signées avec expiration
 * Pour le contenu premium, les URLs expirent après 1 heure
 */
export const SecureImage = ({
  src,
  alt,
  className = '',
  contentId,
  isPremium = false,
  onLoad,
  onError
}: SecureImageProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Utiliser les URLs signées uniquement pour le contenu premium
  const { signedUrl, loading, error } = useSignedUrl(src, {
    bucket: 'content',
    contentId,
    enabled: isPremium && !!src
  });

  // URL finale à afficher
  const displayUrl = isPremium ? signedUrl : src;

  useEffect(() => {
    // Reset état quand l'URL change
    setImageLoaded(false);
    setImageError(false);
  }, [displayUrl]);

  const handleLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setImageError(true);
    onError?.();
  };

  // Afficher le skeleton pendant le chargement
  if (loading || (!displayUrl && isPremium)) {
    return (
      <Skeleton className={`${className} animate-pulse`} />
    );
  }

  // Afficher une erreur si l'URL signée n'a pas pu être obtenue
  if (error && isPremium) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <div className="text-center text-muted-foreground p-4">
          <Lock className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Contenu protégé</p>
        </div>
      </div>
    );
  }

  if (!displayUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-sm">Image non disponible</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Skeleton pendant le chargement de l'image */}
      {!imageLoaded && !imageError && (
        <Skeleton className="absolute inset-0 animate-pulse" />
      )}
      
      <img
        src={displayUrl}
        alt={alt}
        className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none'
        }}
      />

      {/* Afficher erreur si l'image n'a pas pu charger */}
      {imageError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Erreur de chargement</span>
        </div>
      )}
    </div>
  );
};

interface SecureVideoProps {
  src: string | undefined | null;
  poster?: string | null;
  className?: string;
  contentId?: string;
  isPremium?: boolean;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

/**
 * Composant vidéo sécurisée utilisant des URLs signées
 */
export const SecureVideo = ({
  src,
  poster,
  className = '',
  contentId,
  isPremium = false,
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false
}: SecureVideoProps) => {
  const [videoLoaded, setVideoLoaded] = useState(false);

  // URL signée pour la vidéo
  const { signedUrl: signedVideoUrl, loading: videoLoading } = useSignedUrl(src, {
    bucket: 'content',
    contentId,
    enabled: isPremium && !!src
  });

  // URL signée pour le poster
  const { signedUrl: signedPosterUrl } = useSignedUrl(poster, {
    bucket: 'thumbnails',
    enabled: isPremium && !!poster
  });

  const displayVideoUrl = isPremium ? signedVideoUrl : src;
  const displayPosterUrl = isPremium ? signedPosterUrl : poster;

  if (videoLoading) {
    return (
      <Skeleton className={`${className} animate-pulse`} />
    );
  }

  if (!displayVideoUrl) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <span className="text-muted-foreground text-sm">Vidéo non disponible</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!videoLoaded && (
        <Skeleton className="absolute inset-0 animate-pulse" />
      )}
      
      <video
        src={displayVideoUrl}
        poster={displayPosterUrl || undefined}
        className={`${className} ${videoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        onLoadedData={() => setVideoLoaded(true)}
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      />
    </div>
  );
};
