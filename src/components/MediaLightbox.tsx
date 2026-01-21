import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  title?: string;
  description?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Détecter le type de média basé sur l'extension
const detectMediaType = (url: string): 'image' | 'video' => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) ? 'video' : 'image';
};

const MediaLightbox: React.FC<MediaLightboxProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  title,
  description,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolvedMediaType = mediaType || detectMediaType(mediaUrl);

  // Reset quand le média change
  useEffect(() => {
    if (isOpen && mediaUrl) {
      setError(false);
      setLoaded(false);
    }
  }, [isOpen, mediaUrl]);

  // Reset quand fermé
  useEffect(() => {
    if (!isOpen) {
      setLoaded(false);
      setError(false);
      // Pause video when closing
      if (videoRef.current) {
        videoRef.current.pause();
      }
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
          aria-label="Média précédent"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Navigation suivant */}
      {hasNext && onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Média suivant"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Contenu */}
      <div className="flex flex-col items-center max-w-[95vw] max-h-[95vh]">
        {/* Loader */}
        {!loaded && !error && (
          <div className="w-[60vw] max-w-xl aspect-video bg-white/5 animate-pulse rounded-lg" />
        )}

        {/* Erreur */}
        {error && (
          <div className="flex flex-col items-center gap-3 text-red-400">
            <X className="w-12 h-12" />
            <span>Impossible de charger le média</span>
          </div>
        )}

        {/* Image */}
        {mediaUrl && !error && resolvedMediaType === 'image' && (
          <img
            src={mediaUrl}
            alt={title || 'Image'}
            decoding="sync"
            fetchPriority="high"
            className={`max-w-full max-h-[85vh] object-contain rounded-lg transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}

        {/* Video */}
        {mediaUrl && !error && resolvedMediaType === 'video' && (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            muted={false}
            preload="auto"
            crossOrigin="anonymous"
            className={`max-w-full max-h-[85vh] rounded-lg transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            onClick={(e) => e.stopPropagation()}
            onLoadedData={() => setLoaded(true)}
            onCanPlay={() => setLoaded(true)}
            onError={(e) => {
              console.error('[MediaLightbox] Video error:', e);
              setError(true);
            }}
          >
            <source src={mediaUrl} type="video/mp4" />
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        )}
        
        {(title || description) && loaded && (
          <div className="mt-4 text-center px-4">
            {title && <h3 className="text-white text-xl font-bold">{title}</h3>}
            {description && <p className="text-white/70 text-sm mt-1">{description}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLightbox;
