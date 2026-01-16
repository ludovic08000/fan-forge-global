import React, { useState, useCallback, memo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface LazyContentImageProps {
  src: string;
  alt: string;
  className?: string;
  blurred?: boolean;
  onLoad?: () => void;
  priority?: boolean; // Pour les images visibles immédiatement
}

// Cache global des images chargées - persistant
const loadedImagesCache = new Set<string>();

// Précharger une image en background
export const preloadImageFast = (url: string): void => {
  if (!url || loadedImagesCache.has(url)) return;
  const img = new Image();
  img.src = url;
  img.onload = () => loadedImagesCache.add(url);
};

const LazyContentImage: React.FC<LazyContentImageProps> = memo(({
  src,
  alt,
  className = '',
  blurred = false,
  onLoad,
  priority = false,
}) => {
  // Si l'image est déjà dans le cache, afficher immédiatement
  const [imageLoaded, setImageLoaded] = useState(() => loadedImagesCache.has(src));
  const [imageError, setImageError] = useState(false);

  // Précharger au montage si priority
  useEffect(() => {
    if (priority && src) {
      preloadImageFast(src);
    }
  }, [src, priority]);

  const handleLoad = useCallback(() => {
    loadedImagesCache.add(src);
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad, src]);

  const handleError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Skeleton seulement si pas déjà en cache */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Erreur */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageOff className="h-6 w-6 opacity-40" />
        </div>
      )}

      {/* Image - toujours rendue pour chargement immédiat */}
      {!imageError && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="sync"
          fetchPriority={priority ? 'high' : 'auto'}
          className={`
            w-full h-full object-cover
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            ${blurred ? 'blur-xl' : ''}
            ${className}
          `}
          style={{ transition: 'opacity 0.15s ease-out' }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
});

LazyContentImage.displayName = 'LazyContentImage';

export default LazyContentImage;
