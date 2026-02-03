import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

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
 * Lecteur vidéo intégré - joue automatiquement en boucle comme Instagram
 * AUTOPLAY IMMÉDIAT sans clic requis
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
  poster,
  className = '',
  blurred = false,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // URL vidéo publique
  const videoUrl = buildPublicUrl(src, 'content');

  // Poster valide (image uniquement)
  const isValidPoster = poster && 
    !poster.toLowerCase().endsWith('.mp4') && 
    !poster.toLowerCase().endsWith('.mov') &&
    !poster.toLowerCase().endsWith('.webm');
  const posterUrl = isValidPoster ? buildPublicUrl(poster, 'content') : undefined;

  // Forcer la lecture dès que le composant est monté
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || blurred) return;

    // Configuration initiale
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'auto';

    // Essayer de jouer immédiatement
    const playVideo = () => {
      video.play().catch(() => {
        // Si échec, réessayer après un court délai
        setTimeout(() => {
          video.play().catch(() => {});
        }, 100);
      });
    };

    // Jouer dès que les données sont disponibles
    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener('loadeddata', playVideo, { once: true });
      video.addEventListener('canplay', playVideo, { once: true });
    }

    return () => {
      video.removeEventListener('loadeddata', playVideo);
      video.removeEventListener('canplay', playVideo);
    };
  }, [videoUrl, blurred]);

  // Observer pour pause/play basé sur visibilité (optimisation batterie)
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || blurred) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [blurred]);

  const toggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      const newMuted = !video.muted;
      video.muted = newMuted;
      setIsMuted(newMuted);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
    >
      {/* Lecteur vidéo inline - autoplay forcé - toujours visible */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`absolute inset-0 w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        poster={posterUrl}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Bouton mute/unmute */}
      {!blurred && (
        <button
          onClick={toggleMute}
          onTouchEnd={toggleMute}
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
