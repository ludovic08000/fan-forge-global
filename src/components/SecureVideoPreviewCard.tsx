import React, { useRef, useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface SecureVideoPreviewCardProps {
  src: string;
  contentId?: string;
  poster?: string | null;
  className?: string;
  blurred?: boolean;
  showPlayButton?: boolean;
  isPremium?: boolean;
  children?: React.ReactNode;
}

/**
 * Composant vidéo simplifié avec lecture automatique au survol
 * Utilise directement l'URL fournie (R2 public ou Supabase public)
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
  contentId,
  poster,
  className = '',
  blurred = false,
  showPlayButton = true,
  isPremium = false,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // URL à utiliser directement
  const videoUrl = src;

  // Utiliser le poster fourni si disponible
  const effectivePoster = poster && poster.trim() !== '' ? poster : undefined;

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && !videoError && !blurred && videoUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch((err) => {
        console.warn('Video play failed:', err.message);
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
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
    setPosterError(false);
    setPreviewReady(false);
  }, [videoUrl]);

  return (
    <div
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video principale pour le hover */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isHovering && !videoError && !blurred ? 'opacity-100 z-10' : 'opacity-0 z-0'
          } ${blurred ? 'blur-lg' : ''}`}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
          onError={(e) => {
            console.warn('Main video error:', e);
            setVideoError(true);
          }}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{ pointerEvents: isHovering ? 'auto' : 'none' }}
        />
      )}

      {/* Thumbnail/poster ou preview frame quand pas en hover */}
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
          isHovering && !videoError && !blurred ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {effectivePoster && !posterError ? (
          <img
            src={effectivePoster}
            alt=""
            className={`w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onError={() => setPosterError(true)}
          />
        ) : (
          /* Si pas de poster, utiliser une video pour capturer la première frame */
          <video
            ref={previewVideoRef}
            src={videoUrl}
            className={`w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
            muted
            playsInline
            preload="metadata"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onLoadedMetadata={(e) => {
              // Seek to 0.5s to get a frame (not black screen)
              const video = e.currentTarget;
              video.currentTime = 0.5;
            }}
            onSeeked={() => setPreviewReady(true)}
            onError={(e) => {
              console.warn('Preview video error:', e);
            }}
          />
        )}
      </div>

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

export default SecureVideoPreviewCard;
