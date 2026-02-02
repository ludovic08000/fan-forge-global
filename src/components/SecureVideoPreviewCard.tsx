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
 * Affiche la première frame automatiquement
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
  const [hasLoaded, setHasLoaded] = useState(false);

  // URL vidéo publique
  const videoUrl = buildPublicUrl(src, 'content');

  // Détecter si poster est une vraie image (pas une vidéo)
  const isValidPoster = poster && 
    !poster.toLowerCase().endsWith('.mp4') && 
    !poster.toLowerCase().endsWith('.mov') &&
    !poster.toLowerCase().endsWith('.webm');
  
  const posterUrl = isValidPoster ? buildPublicUrl(poster, 'content') : undefined;

  // Forcer l'affichage de la première frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasLoaded) return;

    const showFirstFrame = () => {
      // Avancer à 0.01s pour afficher le premier frame
      if (video.readyState >= 1) {
        video.currentTime = 0.01;
        setHasLoaded(true);
      }
    };

    video.addEventListener('loadedmetadata', showFirstFrame);
    // Si déjà chargé
    if (video.readyState >= 1) {
      showFirstFrame();
    }

    return () => {
      video.removeEventListener('loadedmetadata', showFirstFrame);
    };
  }, [videoUrl, hasLoaded]);

  // AUTOPLAY AU HOVER
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    const video = videoRef.current;
    if (video && !blurred) {
      video.currentTime = 0;
      video.muted = true;
      video.play().catch(() => {});
    }
  }, [blurred]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      // Revenir à la première frame
      video.currentTime = 0.01;
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
      className={`relative w-full h-full bg-muted ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video - affiche la première frame via currentTime */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`absolute inset-0 w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterUrl}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Play button overlay - toujours visible quand pas en hover */}
      {showPlayButton && !isHovering && !blurred && (
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
