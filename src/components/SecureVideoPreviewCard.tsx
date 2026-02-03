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
 * Lecteur vidéo inline - affiche la vidéo DIRECTEMENT comme une image
 * Pas de bouton play, pas de clic requis - lecture automatique muette
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
  poster,
  className = '',
  blurred = false,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // URL vidéo publique - construite immédiatement
  const videoUrl = buildPublicUrl(src, 'content');

  // Pas de poster pour éviter l'affichage d'une image statique
  // On veut que la vidéo soit visible directement

  // Forcer la lecture dès le montage
  useEffect(() => {
    const video = videoRef.current;
    if (!video || blurred) return;

    // Jouer immédiatement
    const attemptPlay = () => {
      video.play().catch(() => {});
    };

    // Si déjà prêt, jouer maintenant
    if (video.readyState >= 1) {
      attemptPlay();
    }
    
    // Écouter les événements de chargement
    video.addEventListener('loadedmetadata', attemptPlay);
    video.addEventListener('canplay', attemptPlay);
    
    return () => {
      video.removeEventListener('loadedmetadata', attemptPlay);
      video.removeEventListener('canplay', attemptPlay);
    };
  }, [blurred, videoUrl]);

  // Pause quand hors viewport pour économiser la batterie
  useEffect(() => {
    const video = videoRef.current;
    if (!video || blurred) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [blurred]);

  const toggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {/* Vidéo directe - visible immédiatement comme une image */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`absolute inset-0 w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        style={{ display: 'block' }}
      />

      {/* Bouton son - discret en bas à gauche */}
      {!blurred && (
        <button
          onClick={toggleMute}
          onTouchEnd={(e) => {
            e.preventDefault();
            toggleMute(e);
          }}
          className="absolute bottom-2 left-2 z-30 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
          aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          {isMuted ? (
            <VolumeX className="h-3.5 w-3.5 text-white" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-white" />
          )}
        </button>
      )}

      {children}
    </div>
  );
};

export default SecureVideoPreviewCard;
