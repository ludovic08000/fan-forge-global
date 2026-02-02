import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Shield, Loader2 } from 'lucide-react';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';

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

// Check if it's a relative path (not a full URL)
const isRelativePath = (url: string): boolean => {
  return !url.startsWith('http://') && !url.startsWith('https://') && !isR2Url(url);
};

// Build the full public URL from a relative path
const SUPABASE_URL = 'https://usjxcgauyvdocngfkhys.supabase.co';
const buildPublicUrl = (path: string, bucket: string = 'content'): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
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
  const isExternalR2 = isR2Url(mediaUrl);
  const isVideo = resolvedMediaType === 'video';
  
  // Convert relative paths to full public URLs for non-premium content
  const normalizedMediaUrl = useMemo(() => {
    if (!mediaUrl) return mediaUrl;
    // Non-premium content: use public URL directly
    if (!isPremium && isRelativePath(mediaUrl)) {
      return buildPublicUrl(mediaUrl, 'content');
    }
    // Non-R2 full URL: use as-is
    if (!isPremium && !isExternalR2) {
      return mediaUrl;
    }
    return mediaUrl;
  }, [mediaUrl, isPremium, isExternalR2]);

  // Only use secure hooks for premium content or R2 URLs
  const needsR2Signing = isExternalR2 && isPremium;
  const needsSupabaseSigning = !isExternalR2 && isPremium;

  // Hook pour URLs R2 sécurisées (replays Cloudflare) - only for premium R2 content
  const { secureUrl: r2SecureUrl, loading: r2Loading, error: r2Error } = useSecureR2Url(
    isOpen && needsR2Signing ? mediaUrl : null,
    {
      contentId,
      enabled: isOpen && needsR2Signing
    }
  );

  // Hook pour URLs Supabase signées (contenu premium stocké sur Supabase)
  const { signedUrl: supabaseSignedUrl, loading: supabaseLoading } = useSignedUrl(
    isOpen && needsSupabaseSigning ? mediaUrl : null,
    {
      bucket: 'content',
      contentId,
      enabled: isOpen && needsSupabaseSigning
    }
  );

  // URL sécurisée finale à utiliser
  const secureMediaUrl = useMemo(() => {
    // Non-premium: always use public URL
    if (!isPremium) {
      return normalizedMediaUrl;
    }
    // Premium R2 content
    if (needsR2Signing) {
      return r2SecureUrl || mediaUrl;
    }
    // Premium Supabase content
    if (needsSupabaseSigning) {
      return supabaseSignedUrl || mediaUrl;
    }
    return normalizedMediaUrl;
  }, [isPremium, needsR2Signing, needsSupabaseSigning, normalizedMediaUrl, r2SecureUrl, supabaseSignedUrl, mediaUrl]);
  
  const urlLoading = needsR2Signing ? r2Loading : (needsSupabaseSigning ? supabaseLoading : false);

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
    if (r2Error && isExternalR2) {
      console.error('[MediaLightbox] R2 URL error:', r2Error);
      setError(true);
    }
  }, [r2Error, isExternalR2]);

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

      {/* Badge sécurisé */}
      {(isExternalR2 || isPremium) && !urlLoading && !error && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-green-500/90 px-3 py-1.5 rounded-full">
          <Shield className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">
            {isExternalR2 ? 'R2 Sécurisé' : 'Sécurisé'}
          </span>
        </div>
      )}

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
        {/* Loader pour URL sécurisée */}
        {urlLoading && (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="text-sm">Chargement sécurisé...</span>
          </div>
        )}

        {/* Loader pour média */}
        {!urlLoading && !loaded && !error && (
          <div className="w-[60vw] max-w-xl aspect-video bg-white/5 animate-pulse rounded-lg" />
        )}

        {/* Erreur */}
        {error && (
          <div className="flex flex-col items-center gap-3 text-red-400">
            <X className="w-12 h-12" />
            <span>Impossible de charger le média</span>
            {r2Error && <span className="text-xs text-red-300">{r2Error}</span>}
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
