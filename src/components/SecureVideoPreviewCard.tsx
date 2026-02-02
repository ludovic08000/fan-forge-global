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
  const cleanPath = path.split('?')[0];
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
};

const isRealR2Url = (url: string): boolean => {
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
};

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
 * Composant vidéo avec autoplay INSTANTANÉ au hover
 * - Précharge la vidéo dès l'entrée dans le viewport
 * - Démarre automatiquement quand la souris survole
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
  const [hasInteracted, setHasInteracted] = useState(false);

  const cleanSrc = useMemo(() => src.split('?')[0], [src]);
  const isExternalR2 = isRealR2Url(cleanSrc);
  
  // URL publique pour contenu gratuit (instantané)
  const publicUrl = useMemo(() => {
    if (!isPremium && !isExternalR2) {
      return buildPublicUrl(cleanSrc, 'content');
    }
    return null;
  }, [cleanSrc, isPremium, isExternalR2]);

  const needsR2SignedUrl = isExternalR2 && isPremium;
  const { secureUrl: r2SecureUrl, loading: r2Loading } = useSecureR2Url(
    needsR2SignedUrl ? cleanSrc : null,
    { contentId, liveStreamId, enabled: needsR2SignedUrl }
  );

  const needsSupabaseSignedUrl = !isExternalR2 && isPremium;
  const { signedUrl: supabaseSignedUrl, loading: supabaseLoading } = useSignedUrl(
    needsSupabaseSignedUrl ? cleanSrc : null,
    { bucket: 'content', contentId, enabled: needsSupabaseSignedUrl }
  );

  // URL finale
  const secureVideoUrl = useMemo(() => {
    if (!isPremium && publicUrl) return publicUrl;
    if (needsR2SignedUrl && r2SecureUrl) return r2SecureUrl;
    if (needsSupabaseSignedUrl && supabaseSignedUrl) return supabaseSignedUrl;
    return publicUrl || buildPublicUrl(cleanSrc, 'content');
  }, [isPremium, publicUrl, needsR2SignedUrl, r2SecureUrl, needsSupabaseSignedUrl, supabaseSignedUrl, cleanSrc]);

  const isLoading = isPremium && (needsR2SignedUrl ? r2Loading : (needsSupabaseSignedUrl ? supabaseLoading : false));

  // Poster propre
  const effectivePoster = useMemo(() => {
    if (!poster || poster.trim() === '') return undefined;
    const posterClean = poster.split('?')[0];
    if (posterClean.endsWith('.mp4') || posterClean.endsWith('.mov') || posterClean.endsWith('.webm')) {
      return undefined;
    }
    if (posterClean.startsWith('http')) return poster;
    return buildPublicUrl(posterClean, 'content');
  }, [poster]);

  // Observer pour précharger au viewport
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
      { rootMargin: '400px', threshold: 0.01 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Précharger la vidéo quand dans le viewport
  useEffect(() => {
    if (!isInView || !secureVideoUrl || isLoading) return;
    
    const video = videoRef.current;
    if (video) {
      // Force le chargement des métadonnées et du buffer
      video.load();
    }
  }, [isInView, secureVideoUrl, isLoading]);

  // AUTOPLAY AU HOVER - Immédiat
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    setHasInteracted(true);
    
    const video = videoRef.current;
    if (video && !videoError && !blurred && secureVideoUrl) {
      video.currentTime = 0;
      video.muted = true; // Toujours muted pour autoplay
      
      // Play immédiat
      video.play().catch((err) => {
        console.log('Autoplay blocked:', err.message);
      });
    }
  }, [videoError, blurred, secureVideoUrl]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    setVideoError(false);
    setVideoReady(false);
  }, [secureVideoUrl]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br from-muted to-muted/50 transition-opacity duration-100 ${
        videoReady ? 'opacity-0' : 'opacity-100'
      }`} />

      {/* Poster statique */}
      {effectivePoster && (
        <img
          src={effectivePoster}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${
            isHovering && videoReady && !blurred ? 'opacity-0' : 'opacity-100'
          } ${blurred ? 'blur-lg' : ''}`}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* Video - toujours présent pour préchargement */}
      {secureVideoUrl && isInView && !isLoading && (
        <video
          ref={videoRef}
          src={secureVideoUrl}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${
            (isHovering && videoReady && !blurred) ? 'opacity-100 z-10' : 
            (videoReady && !effectivePoster ? 'opacity-100' : 'opacity-0')
          } ${blurred ? 'blur-lg' : ''}`}
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* Play button - visible seulement si pas en hover */}
      {showPlayButton && !isHovering && !blurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute button pendant hover */}
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

      {/* Loading pour premium */}
      {isLoading && isPremium && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {children}
    </div>
  );
};

export default SecureVideoPreviewCard;
