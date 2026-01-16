import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  description?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Cache global ultra-rapide pour les images préchargées
const imageCache = new Map<string, HTMLImageElement>();

// Précharger une image - retourne immédiatement si déjà en cache
export const preloadImage = (url: string): void => {
  if (!url || imageCache.has(url)) return;
  
  const img = new Image();
  img.decoding = 'sync';
  img.src = url;
  img.onload = () => imageCache.set(url, img);
};

// Vérifier si une image est en cache
export const isImageCached = (url: string): boolean => imageCache.has(url);

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  description,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset et check cache quand l'image change
  useEffect(() => {
    if (isOpen && imageUrl) {
      setImageError(false);
      // Vérifier si l'image est déjà en cache navigateur ou notre cache
      if (imageCache.has(imageUrl)) {
        setImageLoaded(true);
      } else {
        setImageLoaded(false);
        // Précharger immédiatement
        preloadImage(imageUrl);
      }
    }
  }, [isOpen, imageUrl]);

  // Reset quand fermé
  useEffect(() => {
    if (!isOpen) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) onPrevious();
    if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
  }, [onClose, hasPrevious, hasNext, onPrevious, onNext]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
    >
      {/* Bouton fermer */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation précédent */}
      {hasPrevious && onPrevious && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrevious(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Image précédente"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Navigation suivant */}
      {hasNext && onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Image suivante"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Contenu */}
      <div className="flex flex-col items-center max-w-[95vw] max-h-[95vh]">
        {/* Loader minimal */}
        {!imageLoaded && !imageError && (
          <div className="w-[60vw] max-w-xl aspect-video bg-white/5 animate-pulse rounded-lg" />
        )}

        {/* Erreur */}
        {imageError && (
          <div className="flex flex-col items-center gap-3 text-red-400">
            <X className="w-12 h-12" />
            <span>Impossible de charger l'image</span>
          </div>
        )}

        {/* Image - rendue immédiatement pour bénéficier du cache navigateur */}
        {imageUrl && !imageError && (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={title || 'Image'}
            decoding="sync"
            fetchPriority="high"
            className={`max-w-full max-h-[85vh] object-contain rounded-lg ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => {
              setImageLoaded(true);
              imageCache.set(imageUrl, imgRef.current!);
            }}
            onError={() => setImageError(true)}
          />
        )}
        
        {(title || description) && imageLoaded && (
          <div className="mt-4 text-center px-4">
            {title && <h3 className="text-white text-xl font-bold">{title}</h3>}
            {description && <p className="text-white/70 text-sm mt-1">{description}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
