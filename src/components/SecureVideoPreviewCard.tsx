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

  // URL finale - toujours construite immédiatement pour contenu non-premium
  const videoUrl = useMemo(() => {
    if (!src) return '';
    // Pour le contenu non-premium, construire l'URL publique directement
    if (!isPremium) {
      return buildPublicUrl(src, 'content');
    }
    // Pour le contenu premium, on utilise aussi l'URL publique pour la preview
    // (la protection se fait au niveau du flou et du clic)
    return buildPublicUrl(src, 'content');
  }, [src, isPremium]);

  // Poster propre
  const effectivePoster = useMemo(() => {
    if (!poster || poster.trim() === '') return undefined;
    const posterClean = poster.split('?')[0].toLowerCase();
    if (posterClean.endsWith('.mp4') || posterClean.endsWith('.mov') || posterClean.endsWith('.webm')) {
      return undefined;
    }
    if (poster.startsWith('http')) return poster;
    return buildPublicUrl(poster, 'content');
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
      { rootMargin: '200px', threshold: 0.01 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Précharger la vidéo quand dans le viewport
  useEffect(() => {
    if (!isInView || !videoUrl) return;
    
    const video = videoRef.current;
    if (video && video.src !== videoUrl) {
      video.src = videoUrl;
      video.load();
    }
  }, [isInView, videoUrl]);

  // AUTOPLAY AU HOVER - Immédiat
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    
    const video = videoRef.current;
    if (video && !videoError && !blurred && videoUrl) {
      video.currentTime = 0;
      video.muted = true;
      video.play().catch(() => {
        // Silently handle autoplay block
      });
    }
  }, [videoError, blurred, videoUrl]);

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
      {isInView && videoUrl && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${
            (isHovering && videoReady && !blurred) ? 'opacity-100 z-10' : 
            (videoReady && !effectivePoster ? 'opacity-100' : 'opacity-0')
          } ${blurred ? 'blur-lg' : ''}`}
          muted
          loop
          playsInline
          preload="metadata"
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

      {children}
    </div>
  );
};

export default SecureVideoPreviewCard;
