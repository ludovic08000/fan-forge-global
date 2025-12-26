import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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

  // L'URL effective à utiliser - fallback à l'URL originale si pas de signed URL
  const effectiveUrl = signedUrl || imageUrl;

  // Log pour debug
  React.useEffect(() => {
    if (isOpen && imageUrl) {
      console.log('ImageLightbox debug:', { 
        imageUrl, 
        signedUrl, 
        effectiveUrl, 
        urlLoading, 
        urlError 
      });
    }
  }, [isOpen, imageUrl, signedUrl, effectiveUrl, urlLoading, urlError]);

  // Reset loading state when image changes or when signed URL arrives
  React.useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isOpen, imageUrl]);

  // Reset error when signed URL arrives (new URL to try)
  React.useEffect(() => {
    if (signedUrl && imageError) {
      setImageError(false);
      setImageLoaded(false);
    }
  }, [signedUrl]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) onPrevious();
    if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200"
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
      <div className="flex flex-col items-center max-w-[95vw] max-h-[95vh]">
        {/* Loader */}
        {(urlLoading || (!imageLoaded && !imageError)) && (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span>Chargement...</span>
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
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            style={{ display: imageLoaded && !urlLoading ? 'block' : 'none' }}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => setImageLoaded(true)}
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
