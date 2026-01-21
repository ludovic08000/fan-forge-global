/**
 * Composant d'image optimisée avec lazy loading
 * Améliore les performances en chargeant les images progressivement
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props du composant OptimizedImage
 */
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  lowQualitySrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Composant d'image optimisée avec lazy loading et placeholder
 * 
 * Fonctionnalités :
 * - Lazy loading natif du navigateur
 * - Placeholder pendant le chargement
 * - Support d'image basse qualité en premier (LQIP)
 * - Gestion des erreurs de chargement
 * 
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/path/to/image.jpg"
 *   alt="Description de l'image"
 *   className="w-full h-64 object-cover"
 * />
 * ```
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  placeholderClassName,
  lowQualitySrc,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src);
  const imgRef = useRef<HTMLImageElement>(null);

  /**
   * Gérer le chargement de l'image
   */
  const handleLoad = () => {
    setIsLoaded(true);
    
    // Si on a une image basse qualité, charger la haute qualité
    if (lowQualitySrc && currentSrc === lowQualitySrc) {
      setCurrentSrc(src);
    }
    
    onLoad?.();
  };

  /**
   * Gérer les erreurs de chargement
   */
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  /**
   * Observer l'intersection pour le lazy loading manuel si nécessaire
   */
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // L'image est visible, on peut commencer le chargement
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Commencer à charger 50px avant que l'image soit visible
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  // Afficher un placeholder en cas d'erreur
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
      >
        <svg
          className="w-12 h-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Placeholder pendant le chargement */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            placeholderClassName
          )}
        />
      )}

      {/* Image principale */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </>
  );
};

/**
 * Hook pour précharger des images
 * Utile pour précharger des images critiques
 * 
 * @param imageUrls - Tableau d'URLs d'images à précharger
 * @returns État du préchargement
 * 
 * @example
 * ```tsx
 * const { isLoading, hasError } = useImagePreload([
 *   '/hero-image.jpg',
 *   '/logo.png'
 * ]);
 * ```
 */
export const useImagePreload = (imageUrls: string[]) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    let errorOccurred = false;

    const preloadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
      });
    };

    const loadAllImages = async () => {
      try {
        await Promise.all(imageUrls.map(preloadImage));
        setIsLoading(false);
      } catch (error) {
        setHasError(true);
        setIsLoading(false);
      }
    };

    if (imageUrls.length > 0) {
      loadAllImages();
    } else {
      setIsLoading(false);
    }
  }, [imageUrls]);

  return { isLoading, hasError };
};

export default OptimizedImage;
