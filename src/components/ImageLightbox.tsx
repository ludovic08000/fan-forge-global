import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

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

// Cache global pour les images préchargées
const preloadedImages = new Map<string, HTMLImageElement>();

// Fonction pour précharger une image
export const preloadImage = (url: string): Promise<void> => {
  if (preloadedImages.has(url)) return Promise.resolve();
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.set(url, img);
      resolve();
    };
    img.onerror = () => resolve(); // Ne pas bloquer en cas d'erreur
    img.src = url;
  });
};

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
  // Utiliser l'URL signée pour accéder à l'image
  const { signedUrl, loading: urlLoading, error: urlError } = useSignedUrl(imageUrl, { enabled: isOpen && !!imageUrl });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // L'URL effective à utiliser - fallback à l'URL originale si pas de signed URL
  const effectiveUrl = signedUrl || imageUrl;

  // Vérifier si l'image est déjà préchargée
  const isPreloaded = effectiveUrl ? preloadedImages.has(effectiveUrl) : false;

  // Animation d'entrée fluide
  useEffect(() => {
    if (isOpen) {
      // Délai court pour l'animation
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  // Reset loading state when image changes
  useEffect(() => {
    if (isOpen) {
      setImageError(false);
      // Si l'image est déjà préchargée, marquer comme chargée immédiatement
      if (isPreloaded) {
        setImageLoaded(true);
      } else {
        setImageLoaded(false);
      }
    }
  }, [isOpen, imageUrl, isPreloaded]);

  // Précharger l'image dès que l'URL signée arrive
  useEffect(() => {
    if (effectiveUrl && isOpen && !isPreloaded) {
      preloadImage(effectiveUrl).then(() => {
        setImageLoaded(true);
      });
    }
  }, [effectiveUrl, isOpen, isPreloaded]);

  // Reset error when signed URL arrives
  useEffect(() => {
    if (signedUrl && imageError) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [signedUrl, imageError]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) onPrevious();
    if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
  }, [onClose, hasPrevious, hasNext, onPrevious, onNext]);

  if (!isOpen) return null;

  const isLoading = urlLoading || (!imageLoaded && !imageError && !isPreloaded);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'}`}
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
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Image précédente"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Navigation suivant */}
      {hasNext && onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Image suivante"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Contenu */}
      <div className={`flex flex-col items-center max-w-[95vw] max-h-[95vh] transition-all duration-300 ${showContent ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Skeleton loader animé */}
        {isLoading && (
          <div className="relative w-[80vw] max-w-2xl aspect-square rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.5s_infinite]" 
                 style={{ transform: 'translateX(-100%)', animation: 'shimmer 1.5s infinite' }} />
          </div>
        )}

        {/* Erreur */}
        {imageError && !urlLoading && (
          <div className="flex flex-col items-center gap-3 text-red-400">
            <X className="w-12 h-12" />
            <span>Impossible de charger l'image</span>
            {urlError && <span className="text-xs text-red-300">{urlError}</span>}
            <button 
              onClick={() => {
                setImageError(false);
                setImageLoaded(false);
                if (effectiveUrl) preloadedImages.delete(effectiveUrl);
              }}
              className="text-sm text-white/70 underline hover:text-white"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Image */}
        {effectiveUrl && (
          <img
            src={effectiveUrl}
            alt={title || 'Image en plein écran'}
            className={`max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${imageLoaded && !isLoading ? 'opacity-100' : 'opacity-0 absolute'}`}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => {
              setImageLoaded(true);
              if (effectiveUrl) preloadImage(effectiveUrl);
            }}
            onError={() => setImageError(true)}
          />
        )}
        
        {(title || description) && imageLoaded && !isLoading && (
          <div className="mt-4 text-center px-4 transition-opacity duration-300">
            {title && <h3 className="text-white text-xl font-bold">{title}</h3>}
            {description && <p className="text-white/70 text-sm mt-1">{description}</p>}
          </div>
        )}
      </div>

      {/* CSS pour l'animation shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default ImageLightbox;
