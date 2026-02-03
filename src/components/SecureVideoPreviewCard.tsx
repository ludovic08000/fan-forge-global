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
  const [isReady, setIsReady] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // URL vidéo publique
  const videoUrl = buildPublicUrl(src, 'content');

  // Poster valide (image uniquement)
  const isValidPoster = poster && 
    !poster.toLowerCase().endsWith('.mp4') && 
    !poster.toLowerCase().endsWith('.mov') &&
    !poster.toLowerCase().endsWith('.webm');
  const posterUrl = isValidPoster ? buildPublicUrl(poster, 'content') : undefined;

  // Observer pour détecter quand la vidéo est visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.3, rootMargin: '50px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Jouer automatiquement quand visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (isInView && !blurred) {
      video.muted = true;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isInView, videoUrl, blurred]);

  // Initialisation vidéo
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.src = videoUrl;
    video.muted = true;
    video.load();

    const handleReady = () => setIsReady(true);
    video.addEventListener('loadeddata', handleReady);
    video.addEventListener('canplay', handleReady);

    return () => {
      video.removeEventListener('loadeddata', handleReady);
      video.removeEventListener('canplay', handleReady);
    };
  }, [videoUrl]);

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
      className={`relative w-full h-full bg-black ${className}`}
    >
      {/* Lecteur vidéo inline - autoplay */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${blurred ? 'blur-lg' : ''} ${isReady ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        muted
        loop
        autoPlay
        playsInline
        webkit-playsinline="true"
        preload="auto"
        poster={posterUrl}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Loading skeleton */}
      {!isReady && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Bouton mute/unmute - toujours visible */}
      {isReady && !blurred && (
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
