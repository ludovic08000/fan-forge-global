import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';

interface LazyContentImageProps {
  src: string;
  alt: string;
  className?: string;
  blurred?: boolean;
  onLoad?: () => void;
  priority?: boolean;
}

// Cache global des images chargées
const loadedImagesCache = new Set<string>();

// Queue de préchargement avec limite de concurrence
const preloadQueue: string[] = [];
let activePreloads = 0;
const MAX_CONCURRENT_PRELOADS = 4;

const processPreloadQueue = () => {
  while (preloadQueue.length > 0 && activePreloads < MAX_CONCURRENT_PRELOADS) {
    const url = preloadQueue.shift();
    if (url && !loadedImagesCache.has(url)) {
      activePreloads++;
      const img = new Image();
      img.onload = () => {
        loadedImagesCache.add(url);
        activePreloads--;
        processPreloadQueue();
      };
      img.onerror = () => {
        activePreloads--;
        processPreloadQueue();
      };
      img.src = url;
    }
  }
};

/**
 * Précharger une image immédiatement (pour lightbox)
 */
export const preloadImage = (url: string): void => {
  if (!url || loadedImagesCache.has(url)) return;
  const img = new Image();
  img.decoding = 'sync';
  img.src = url;
  img.onload = () => loadedImagesCache.add(url);
};

/**
 * Précharger une image en background avec queue
 */
export const preloadImageFast = (url: string): void => {
  if (!url || loadedImagesCache.has(url) || preloadQueue.includes(url)) return;
  preloadQueue.push(url);
  processPreloadQueue();
};

/**
 * Précharger plusieurs images en batch
 */
export const preloadImagesBatch = (urls: string[]): void => {
  urls.forEach(url => {
    if (url && !loadedImagesCache.has(url) && !preloadQueue.includes(url)) {
      preloadQueue.push(url);
    }
  });
  processPreloadQueue();
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
  const imgRef = useRef<HTMLImageElement>(null);

  // Précharger au montage si priority
  useEffect(() => {
    if (priority && src && !loadedImagesCache.has(src)) {
      // Pour priority, charger immédiatement sans queue
      const img = new Image();
      img.src = src;
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

  // Si déjà en cache, marquer comme chargé
  useEffect(() => {
    if (loadedImagesCache.has(src) && !imageLoaded) {
      setImageLoaded(true);
    }
  }, [src, imageLoaded]);

  return (
    <div className="relative w-full h-full">
      {/* Placeholder transparent */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0" />
      )}

      {/* Erreur */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <ImageOff className="h-6 w-6 opacity-40 text-white" />
        </div>
      )}

      {/* Image */}
      {!imageError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`
            w-full h-full object-cover
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            ${blurred ? 'blur-xl' : ''}
            ${className}
          `}
          style={{ transition: 'opacity 0.1s ease-out' }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
});

LazyContentImage.displayName = 'LazyContentImage';

export default LazyContentImage;
