import React, { useRef, useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, Loader2, Shield } from 'lucide-react';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';
import { useSignedUrl } from '@/hooks/useSignedUrl';

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
 * Composant vidéo sécurisé avec lecture automatique au survol
 * Utilise des URLs signées pour le contenu R2 (Cloudflare) et Supabase
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

  // Détecter si c'est une URL R2 externe (Cloudflare)
  const isExternalR2 = isR2Url(src);
  
  // Vérifier si c'est une URL publique Supabase Storage
  const isSupabasePublicUrl = src.includes('supabase.co/storage/v1/object/public/');

  // Debug désactivé pour performances
  // console.log('[SecureVideoPreviewCard] Rendering');

  // Hook pour URLs R2 sécurisées (Cloudflare) - utilise get-replay-url avec clés API
  const { secureUrl: r2SecureUrl, loading: r2Loading, error: r2Error } = useSecureR2Url(
    isExternalR2 ? src : null,
    {
      contentId,
      enabled: isExternalR2
    }
  );

  // Hook pour URLs Supabase signées (contenu stocké sur Supabase Storage)
  // Activer pour TOUT contenu premium (pas seulement si isPremium est true)
  const needsSignedUrl = !isExternalR2 && isPremium;
  const { signedUrl: supabaseSignedUrl, loading: supabaseLoading } = useSignedUrl(
    needsSignedUrl ? src : null,
    {
      bucket: 'content',
      contentId,
      enabled: needsSignedUrl
    }
  );

  const getSecureVideoUrl = (): string => {
    if (isExternalR2) {
      if (r2Loading) return '';
      if (r2Error) return '';
      return r2SecureUrl || '';
    } else if (isPremium && supabaseSignedUrl) {
      return supabaseSignedUrl;
    }
    return src;
  };

  const secureVideoUrl = getSecureVideoUrl();
  const isLoading = isExternalR2 ? r2Loading : (isPremium ? supabaseLoading : false);

  // Utiliser le poster fourni si disponible
  const effectivePoster = poster && poster.trim() !== '' ? poster : undefined;

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && !videoError && !blurred && secureVideoUrl) {
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

  useEffect(() => {
    setVideoError(false);
    setVideoLoaded(false);
    setPosterError(false);
    setPreviewReady(false);
  }, [secureVideoUrl]);

  return (
    <div
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Loading state pour URL sécurisée */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Video principale pour le hover */}
      {secureVideoUrl && !isLoading && (
        <video
          ref={videoRef}
          src={secureVideoUrl}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isHovering && !videoError && !blurred ? 'opacity-100 z-10' : 'opacity-0 z-0'
          } ${blurred ? 'blur-lg' : ''}`}
          muted={isMuted}
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setVideoLoaded(true)}
          onError={(e) => {
            console.warn('Main video error:', e, 'URL:', secureVideoUrl?.substring(0, 100));
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
          isHovering && !videoError && !blurred && !isLoading ? 'opacity-0' : 'opacity-100'
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
        ) : !isLoading && secureVideoUrl ? (
          /* Si pas de poster, utiliser une video pour capturer la première frame */
          <video
            ref={previewVideoRef}
            src={secureVideoUrl}
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
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
        )}
      </div>

      {/* Badge sécurisé pour les vidéos R2 */}
      {isExternalR2 && r2SecureUrl && isHovering && !videoError && !isLoading && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-green-500/90 px-2 py-0.5 rounded-full">
          <Shield className="h-3 w-3 text-white" />
          <span className="text-[10px] font-semibold text-white">
            Sécurisé
          </span>
        </div>
      )}

      {/* Play button overlay - visible quand pas en hover et pas flouté */}
      {showPlayButton && !isHovering && !blurred && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute button pendant le hover */}
      {isHovering && !videoError && !blurred && !isLoading && (
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
