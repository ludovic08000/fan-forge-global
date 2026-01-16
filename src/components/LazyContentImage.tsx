import React, { useState, useCallback, memo } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';

interface LazyContentImageProps {
  src: string;
  alt: string;
  className?: string;
  blurred?: boolean;
  onLoad?: () => void;
}

const LazyContentImage: React.FC<LazyContentImageProps> = memo(({
  src,
  alt,
  className = '',
  blurred = false,
  onLoad,
}) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '100px', // Précharger 100px avant d'être visible
    freezeOnceVisible: true,
  });
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageError(true);
  }, []);

  return (
    <div ref={ref} className="relative w-full h-full">
      {/* Skeleton pendant le chargement */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 overflow-hidden">
          <Skeleton className="w-full h-full" />
          {/* Effet shimmer */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ 
              animation: 'shimmer 1.5s infinite',
              transform: 'translateX(-100%)'
            }}
          />
        </div>
      )}

      {/* Erreur de chargement */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center text-muted-foreground">
            <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <span className="text-xs">Image non disponible</span>
          </div>
        </div>
      )}

      {/* Image - chargée seulement quand visible */}
      {isVisible && !imageError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`
            w-full h-full object-cover transition-all duration-300
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            ${blurred ? 'blur-xl' : ''}
            ${className}
          `}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* CSS pour l'animation shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
});

LazyContentImage.displayName = 'LazyContentImage';

export default LazyContentImage;
