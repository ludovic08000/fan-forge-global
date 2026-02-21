import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';
import { Skeleton } from '@/components/ui/skeleton';
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
  contentId?: string;
  isPremium?: boolean;
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
  contentId,
  isPremium = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolvedMediaType = mediaType || detectMediaType(mediaUrl);
  // Use the shared isR2Url which correctly detects relative paths as R2 content
  const isR2Content = useMemo(() => isR2Url(mediaUrl), [mediaUrl]);
  const isVideo = resolvedMediaType === 'video';

  // All content is on R2 — always use secure R2 URL
  const { secureUrl: r2SecureUrl, loading: r2Loading, error: r2Error } = useSecureR2Url(
    isOpen && isR2Content ? mediaUrl : null,
    {
      contentId,
      enabled: isOpen && isR2Content
    }
  );

  // URL sécurisée finale
  const secureMediaUrl = useMemo(() => {
    if (isR2Content) {
      if (r2Loading) return '';
      if (r2Error) return '';
      return r2SecureUrl || '';
    }
    return mediaUrl;
  }, [isR2Content, r2SecureUrl, mediaUrl, r2Loading, r2Error]);
  
  const urlLoading = isR2Content ? r2Loading : false;

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

  // Handle R2 URL error
  useEffect(() => {
    if (r2Error && isR2Content) {
      console.error('[MediaLightbox] R2 URL error:', r2Error);
      setError(true);
    }
  }, [r2Error, isR2Content]);

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
        {/* Skeleton discret pendant le chargement - aucun texte */}
        {(urlLoading || (!loaded && !error)) && (
          <div className="w-[60vw] max-w-xl aspect-video rounded-lg overflow-hidden">
            <Skeleton className="w-full h-full" />
          </div>
        )}

        {/* Erreur silencieuse - placeholder sombre */}
        {error && !urlLoading && (
          <div className="w-[60vw] max-w-xl aspect-video bg-black/80 rounded-lg flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/10" />
          </div>
        )}

        {/* Image */}
        {!urlLoading && secureMediaUrl && !error && resolvedMediaType === 'image' && (
          <img
            src={secureMediaUrl}
            alt={title || 'Image'}
            decoding="sync"
            className={`max-w-full max-h-[85vh] object-contain rounded-lg transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            onClick={(e) => e.stopPropagation()}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        )}

        {/* Video */}
        {!urlLoading && secureMediaUrl && !error && resolvedMediaType === 'video' && (
          <video
            key={secureMediaUrl}
            ref={videoRef}
            src={secureMediaUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className={`max-w-full max-h-[85vh] rounded-lg transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
            style={{ minWidth: '300px', minHeight: '200px' }}
            onClick={(e) => e.stopPropagation()}
            onLoadedMetadata={() => setLoaded(true)}
            onError={() => setError(true)}
            onContextMenu={(e) => e.preventDefault()}
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
          />
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
