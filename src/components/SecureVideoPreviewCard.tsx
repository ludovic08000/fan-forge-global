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
 * Composant vidéo premium avec preview et autoplay au hover/touch
 * Affiche une vraie frame de la vidéo (pas noire) et anime au survol
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
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // URL vidéo publique
  const videoUrl = buildPublicUrl(src, 'content');

  // Poster valide (image uniquement)
  const isValidPoster = poster && 
    !poster.toLowerCase().endsWith('.mp4') && 
    !poster.toLowerCase().endsWith('.mov') &&
    !poster.toLowerCase().endsWith('.webm');
  const posterUrl = isValidPoster ? buildPublicUrl(poster, 'content') : undefined;

  // Initialisation vidéo - afficher frame visible (pas noire)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.src = videoUrl;
    video.muted = true;
    video.load();

    const seekToVisibleFrame = () => {
      // Aller à 1 seconde pour éviter les frames d'intro noires
      const targetTime = Math.min(1, video.duration * 0.1);
      if (video.currentTime !== targetTime) {
        video.currentTime = targetTime;
      }
      setIsReady(true);
    };

    const handleSeeked = () => {
      setIsReady(true);
    };

    video.addEventListener('loadeddata', seekToVisibleFrame);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('loadeddata', seekToVisibleFrame);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [videoUrl]);

  // Play/Pause handlers
  const startPlaying = useCallback(async () => {
    const video = videoRef.current;
    if (!video || blurred) return;

    setIsHovering(true);
    video.currentTime = 0;
    video.muted = true;

    try {
      await video.play();
    } catch {
      // Silently fail - iOS may block
    }
  }, [blurred]);

  const stopPlaying = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsHovering(false);
    video.pause();
    // Revenir à une frame visible
    const targetTime = Math.min(1, video.duration * 0.1);
    video.currentTime = targetTime || 1;
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!video.muted);
    }
  }, []);

  return (
    <div
      className={`relative w-full h-full bg-black ${className}`}
      onMouseEnter={startPlaying}
      onMouseLeave={stopPlaying}
      onTouchStart={startPlaying}
      onTouchEnd={stopPlaying}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${blurred ? 'blur-lg' : ''} ${isReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
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

      {/* Loading state */}
      {!isReady && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Play icon quand pas en hover */}
      {showPlayButton && !isHovering && !blurred && isReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/50 rounded-full p-3">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute toggle pendant lecture */}
      {isHovering && !blurred && (
        <button
          onClick={toggleMute}
          className="absolute bottom-2 left-2 z-30 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
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
