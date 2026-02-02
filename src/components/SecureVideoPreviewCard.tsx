import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';

// Build public URL from relative path
const SUPABASE_URL = 'https://usjxcgauyvdocngfkhys.supabase.co';
const buildPublicUrl = (path: string, bucket: string = 'content'): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.split('?')[0];
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
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
 * Composant vidéo avec prévisualisation et autoplay au hover
 * Affiche la première frame de la vidéo immédiatement
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
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

  // URL vidéo publique
  const videoUrl = useMemo(() => {
    if (!src) return '';
    return buildPublicUrl(src, 'content');
  }, [src]);

  // Poster propre - seulement si c'est une vraie image
  const effectivePoster = useMemo(() => {
    if (!poster || poster.trim() === '') return undefined;
    const posterClean = poster.split('?')[0].toLowerCase();
    // Ne pas utiliser de vidéo comme poster
    if (posterClean.endsWith('.mp4') || posterClean.endsWith('.mov') || posterClean.endsWith('.webm') || posterClean.endsWith('.avi')) {
      return undefined;
    }
    if (poster.startsWith('http')) return poster;
    return buildPublicUrl(poster, 'content');
  }, [poster]);

  // Observer pour déclencher le chargement au viewport
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
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Charger la vidéo quand visible
  useEffect(() => {
    if (!isInView || !videoUrl) return;
    
    const video = videoRef.current;
    if (video) {
      video.src = videoUrl;
      video.load();
    }
  }, [isInView, videoUrl]);

  // AUTOPLAY AU HOVER
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    
    const video = videoRef.current;
    if (video && !videoError && !blurred) {
      video.muted = true;
      video.play().catch(() => {});
    }
  }, [videoError, blurred]);

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
  }, [videoUrl]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background gradient - visible pendant chargement */}
      <div className={`absolute inset-0 bg-gradient-to-br from-muted to-muted/50 ${
        videoReady ? 'opacity-0' : 'opacity-100'
      }`} />

      {/* Video - affiche la première frame automatiquement */}
      {isInView && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
          muted
          loop
          playsInline
          preload="metadata"
          poster={effectivePoster}
          onLoadedData={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* Play button overlay - visible quand pas en hover */}
      {showPlayButton && !isHovering && !blurred && videoReady && (
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

      {children}
    </div>
  );
};

export default SecureVideoPreviewCard;
