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

// Detect iOS device
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
 * Composant vidéo avec preview et autoplay au hover/touch
 * Compatible iOS Safari/Chrome avec politiques d'autoplay strictes
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
  const [canAutoplay, setCanAutoplay] = useState(true);
  const iOSDevice = isIOS();

  // URL vidéo publique - construite immédiatement
  const videoUrl = buildPublicUrl(src, 'content');

  // Détecter si poster est une vraie image (pas une vidéo)
  const isValidPoster = poster && 
    !poster.toLowerCase().endsWith('.mp4') && 
    !poster.toLowerCase().endsWith('.mov') &&
    !poster.toLowerCase().endsWith('.webm');
  
  const posterUrl = isValidPoster ? buildPublicUrl(poster, 'content') : undefined;

  // Charger la vidéo et afficher la première frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    // Configuration iOS-compatible
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    video.src = videoUrl;
    video.load();

    const handleCanPlay = () => {
      // Aller à 0.1s pour afficher le premier frame
      if (video.currentTime === 0) {
        video.currentTime = 0.1;
      }
      setIsVideoLoaded(true);
    };

    const handleLoadedData = () => {
      if (video.currentTime === 0) {
        video.currentTime = 0.1;
      }
      setIsVideoLoaded(true);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);

    // Test autoplay capability (important pour iOS)
    const testAutoplay = async () => {
      try {
        video.muted = true;
        await video.play();
        video.pause();
        video.currentTime = 0.1;
        setCanAutoplay(true);
      } catch {
        setCanAutoplay(false);
      }
    };

    // Délai pour laisser le temps au chargement
    const timer = setTimeout(testAutoplay, 500);

    return () => {
      clearTimeout(timer);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoUrl]);

  // Fonction de lecture compatible iOS
  const playVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video || blurred) return;

    video.currentTime = 0;
    video.muted = true; // OBLIGATOIRE pour autoplay iOS

    try {
      await video.play();
    } catch (error) {
      // Autoplay bloqué - on affiche juste le premier frame
      console.log('[iOS Video] Autoplay blocked, showing first frame');
      setCanAutoplay(false);
    }
  }, [blurred]);

  const pauseVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0.1;
  }, []);

  // HOVER - Desktop
  const handleMouseEnter = useCallback(() => {
    if (iOSDevice) return; // iOS utilise touch
    setIsHovering(true);
    playVideo();
  }, [iOSDevice, playVideo]);

  const handleMouseLeave = useCallback(() => {
    if (iOSDevice) return;
    setIsHovering(false);
    pauseVideo();
  }, [iOSDevice, pauseVideo]);

  // TOUCH - iOS/Mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!iOSDevice) return;
    e.preventDefault();
    setIsHovering(true);
    playVideo();
  }, [iOSDevice, playVideo]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!iOSDevice) return;
    e.preventDefault();
    // Délai pour permettre de voir l'animation
    setTimeout(() => {
      setIsHovering(false);
      pauseVideo();
    }, 300);
  }, [iOSDevice, pauseVideo]);

  const toggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Video - iOS-compatible avec playsinline */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${blurred ? 'blur-lg' : ''} ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
        muted
        loop
        playsInline
        webkit-playsinline="true"
        preload="auto"
        poster={posterUrl}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Gradient de chargement */}
      {!isVideoLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 animate-pulse" />
      )}

      {/* Play button - visible quand pas en hover */}
      {showPlayButton && !isHovering && !blurred && isVideoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Indicateur iOS si autoplay bloqué */}
      {iOSDevice && !canAutoplay && isVideoLoaded && !isHovering && (
        <div className="absolute bottom-2 right-2 z-20 px-2 py-1 rounded bg-black/60 text-white text-xs">
          Touchez pour animer
        </div>
      )}

      {/* Mute button pendant hover/touch */}
      {isHovering && !blurred && (
        <button
          onClick={toggleMute}
          onTouchEnd={toggleMute}
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
