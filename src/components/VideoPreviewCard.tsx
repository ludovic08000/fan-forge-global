import React, { useRef, useState, useEffect } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';

interface VideoPreviewCardProps {
  src: string;
  poster?: string | null;
  className?: string;
  blurred?: boolean;
  showPlayButton?: boolean;
  children?: React.ReactNode;
}

/**
 * Composant vidéo avec lecture automatique au survol
 * Affiche la première frame de la vidéo comme poster si aucun poster n'est fourni
 */
export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({
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
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [firstFrameLoaded, setFirstFrameLoaded] = useState(false);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && !videoError && !blurred) {
      // Ne pas reset à 0 pour garder la preview visible
      videoRef.current.play().catch(() => {
        setVideoError(true);
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      // Reset to first frame pour l'aperçu
      videoRef.current.currentTime = 0;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted(!isMuted);
  };

  // Reset error state when URL changes
  useEffect(() => {
    setVideoError(false);
    setVideoLoaded(false);
    setFirstFrameLoaded(false);
  }, [src]);

  // Charger la première frame comme aperçu
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      // Aller à 0.5 seconde pour éviter un écran noir
      videoRef.current.currentTime = 0.5;
    }
  };

  const handleSeeked = () => {
    setFirstFrameLoaded(true);
  };

  const hasPoster = poster && poster.trim() !== '';

  return (
    <div
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video element - toujours visible pour servir de preview */}
      <video
        ref={videoRef}
        src={src}
        className={`absolute inset-0 w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        poster={hasPoster ? poster : undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
        onLoadedData={() => setVideoLoaded(true)}
        onError={() => setVideoError(true)}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Fallback gradient si vidéo en erreur */}
      {videoError && (
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted/50 ${blurred ? 'blur-lg' : ''}`} />
      )}

      {/* Play button overlay - visible quand pas en hover et pas flouté */}
      {showPlayButton && !isHovering && !blurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute button pendant le hover */}
      {isHovering && !videoError && !blurred && (
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

      {/* Children overlay (badges, stats, etc.) */}
      {children}
    </div>
  );
};

export default VideoPreviewCard;
