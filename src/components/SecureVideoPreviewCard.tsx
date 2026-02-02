import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { useSecureR2Url } from '@/hooks/useSecureR2Url';
import { useSignedUrl } from '@/hooks/useSignedUrl';

// Build public URL from relative path
const SUPABASE_URL = 'https://usjxcgauyvdocngfkhys.supabase.co';
const buildPublicUrl = (path: string, bucket: string = 'content'): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

// Check if it's a real R2 URL (not just a relative path)
const isRealR2Url = (url: string): boolean => {
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
};

// Cache global pour préchargement des vidéos
const videoPreloadCache = new Set<string>();

interface SecureVideoPreviewCardProps {
  src: string;
  contentId?: string;
  liveStreamId?: string;
  poster?: string | null;
  className?: string;
  blurred?: boolean;
  showPlayButton?: boolean;
  isPremium?: boolean;
  children?: React.ReactNode;
}

/**
 * Composant vidéo ultra-optimisé avec chargement instantané
 * - Préchargement au viewport via IntersectionObserver
 * - Cache navigateur agressif
 * - Pas de skeleton visible, transition fluide
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
  contentId,
  liveStreamId,
  poster,
  className = '',
  blurred = false,
  showPlayButton = true,
  isPremium = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Détecter si c'est une vraie URL R2 externe
  const isExternalR2 = isRealR2Url(src);
  
  // Pour le contenu non-premium, utiliser l'URL publique directement (instantané)
  const publicUrl = useMemo(() => {
    if (!isPremium && !isExternalR2) {
      return buildPublicUrl(src, 'content');
    }
    return null;
  }, [src, isPremium, isExternalR2]);

  // Hook pour URLs R2 sécurisées - UNIQUEMENT pour le contenu premium R2
  const needsR2SignedUrl = isExternalR2 && isPremium;
  const { secureUrl: r2SecureUrl, loading: r2Loading } = useSecureR2Url(
    needsR2SignedUrl ? src : null,
    { contentId, liveStreamId, enabled: needsR2SignedUrl }
  );

  // Hook pour URLs Supabase signées - UNIQUEMENT pour le contenu premium Supabase
  const needsSupabaseSignedUrl = !isExternalR2 && isPremium;
  const { signedUrl: supabaseSignedUrl, loading: supabaseLoading } = useSignedUrl(
    needsSupabaseSignedUrl ? src : null,
    { bucket: 'content', contentId, enabled: needsSupabaseSignedUrl }
  );

  // URL finale - priorité à l'URL publique pour le contenu gratuit (instantané)
  const secureVideoUrl = useMemo(() => {
    if (!isPremium && publicUrl) return publicUrl;
    if (needsR2SignedUrl) return r2SecureUrl || '';
    if (needsSupabaseSignedUrl) return supabaseSignedUrl || '';
    return publicUrl || src;
  }, [isPremium, publicUrl, needsR2SignedUrl, r2SecureUrl, needsSupabaseSignedUrl, supabaseSignedUrl, src]);

  const isLoading = needsR2SignedUrl ? r2Loading : (needsSupabaseSignedUrl ? supabaseLoading : false);

  // Utiliser le poster fourni si disponible
  const effectivePoster = poster && poster.trim() !== '' ? poster : undefined;

  // IntersectionObserver pour précharger au viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Précharger la vidéo quand elle entre dans le viewport
  useEffect(() => {
    if (!isInView || !secureVideoUrl || videoPreloadCache.has(secureVideoUrl)) return;
    
    // Préchargement via link preload
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = secureVideoUrl;
    document.head.appendChild(link);
    
    videoPreloadCache.add(secureVideoUrl);
    
    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, [isInView, secureVideoUrl]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (videoRef.current && !videoError && !blurred && secureVideoUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [videoError, blurred, secureVideoUrl]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted(prev => !prev);
  }, []);

  // Reset states quand l'URL change
  useEffect(() => {
    setVideoError(false);
    setVideoReady(false);
  }, [secureVideoUrl]);

  // Background gradient pour le chargement initial (pas de skeleton visible)
  const showGradientBg = !effectivePoster && !videoReady && !isLoading;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background gradient instantané (pas de flash blanc) */}
      <div className={`absolute inset-0 bg-gradient-to-br from-muted to-muted/50 transition-opacity duration-200 ${
        (effectivePoster || videoReady) ? 'opacity-0' : 'opacity-100'
      }`} />

      {/* Poster image - affichage instantané */}
      {effectivePoster && (
        <img
          src={effectivePoster}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            isHovering && videoReady && !blurred ? 'opacity-0' : 'opacity-100'
          } ${blurred ? 'blur-lg' : ''}`}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          loading="lazy"
        />
      )}

      {/* Video - préchargement agressif avec preload="auto" */}
      {secureVideoUrl && isInView && !isLoading && (
        <video
          ref={videoRef}
          src={secureVideoUrl}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            isHovering && !videoError && !blurred ? 'opacity-100 z-10' : (videoReady && !effectivePoster ? 'opacity-100' : 'opacity-0')
          } ${blurred ? 'blur-lg' : ''}`}
          muted={isMuted}
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{ pointerEvents: isHovering ? 'auto' : 'none' }}
        />
      )}

      {/* Play button overlay */}
      {showPlayButton && !isHovering && !blurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute button pendant le hover */}
      {isHovering && !videoError && !blurred && videoReady && (
        <button
          onClick={toggleMute}
          className="absolute bottom-2 left-2 z-30 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 text-white" />
          )}
        </button>
      )}

      {/* Children overlay */}
      {children}
    </div>
  );
};

export default SecureVideoPreviewCard;
