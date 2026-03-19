import React, { useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Video } from 'lucide-react';

// Build public URL from relative path (only if not already a full URL)
const SUPABASE_URL = 'https://usjxcgauyvdocngfkhys.supabase.co';
const buildPublicUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Don't try to build Supabase URL for R2 paths - they should be resolved upstream
  const cleanPath = path.split('?')[0];
  return `${SUPABASE_URL}/storage/v1/object/public/content/${cleanPath}`;
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
 * Lecteur vidéo SIMPLE - affiche directement la vidéo comme une image
 * Avec fallback en cas d'erreur de chargement
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
  className = '',
  blurred = false,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);

  const videoUrl = buildPublicUrl(src);

  const toggleMute = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  // Fallback si la vidéo ne charge pas
  if (hasError || !videoUrl) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center bg-muted ${className}`}>
        <Video className="h-8 w-8 text-muted-foreground" />
        {children}
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        className={`w-full h-full object-cover ${blurred ? 'blur-lg' : ''}`}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        onError={() => setHasError(true)}
      />

      {!blurred && (
        <button
          onClick={toggleMute}
          className="absolute bottom-2 left-2 z-30 p-1.5 rounded-full bg-black/60"
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