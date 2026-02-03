import React, { useRef, useState, useCallback, useEffect } from 'react';
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
 * Composant vidéo avec preview et autoplay au hover
 * Charge la vidéo immédiatement et joue au survol
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
  poster,
  className = '',
  blurred = false,
  showPlayButton = true,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // URL vidéo publique - construite immédiatement
  const videoUrl = buildPublicUrl(src, 'content');

  // Détecter si poster est une vraie image (pas une vidéo)
  const isValidPoster = poster && 
    !poster.toLowerCase().endsWith('.mp4') && 
    !poster.toLowerCase().endsWith('.mov') &&
    !poster.toLowerCase().endsWith('.webm');
  
  const posterUrl = isValidPoster ? buildPublicUrl(poster, 'content') : undefined;

  // Charger la vidéo dès le montage et afficher la première frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Forcer le chargement de la vidéo
    video.src = videoUrl;
    video.load();

    const handleLoadedData = () => {
      // Aller à 0.1s pour afficher le premier frame (pas 0 car parfois noir)
      video.currentTime = 0.1;
      setIsVideoLoaded(true);
    };

    const handleLoadedMetadata = () => {
      // Fallback: afficher frame dès que les metadata sont chargées
      if (video.readyState >= 1) {
        video.currentTime = 0.1;
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoUrl]);

  // AUTOPLAY AU HOVER - sans clic nécessaire
  const handleMouseEnter = useCallback(() => {
    if (blurred) return;
    
    setIsHovering(true);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.muted = true; // Obligatoire pour autoplay navigateur
      
      // Tenter de jouer immédiatement
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay bloqué - on garde le premier frame visible
          console.log('[Video] Autoplay blocked by browser');
        });
      }
    }
  }, [blurred]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      // Revenir à la première frame
      video.currentTime = 0.1;
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(prev => !prev);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-muted ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
    >
      {/* Video - toujours présente, affiche la première frame */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${blurred ? 'blur-lg' : ''} ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
        muted
        loop
        playsInline
        preload="auto"
        poster={posterUrl}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Gradient de chargement avant que la vidéo soit prête */}
      {!isVideoLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 animate-pulse" />
      )}

      {/* Play button overlay - visible quand pas en hover ET vidéo chargée */}
      {showPlayButton && !isHovering && !blurred && isVideoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute button pendant hover */}
      {isHovering && !blurred && (
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
