import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { useSecureR2Url } from '@/hooks/useSecureR2Url';
import { useSignedUrl } from '@/hooks/useSignedUrl';

// Build public URL from relative path
const SUPABASE_URL = 'https://usjxcgauyvdocngfkhys.supabase.co';
const buildPublicUrl = (path: string, bucket: string = 'content'): string => {
  // Si c'est déjà une URL complète, la retourner
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Nettoyer le path des query strings avant de construire l'URL
  const cleanPath = path.split('?')[0];
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
};

// Check if it's a real R2 URL (not just a relative path)
const isRealR2Url = (url: string): boolean => {
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
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
 * Composant vidéo ultra-optimisé avec chargement instantané et autoplay au hover
 * - URLs publiques pour le contenu gratuit (instantané, pas de latence signature)
 * - Préchargement au viewport via IntersectionObserver
 * - Autoplay immédiat au survol souris
 */
export const SecureVideoPreviewCard: React.FC<SecureVideoPreviewCardProps> = ({
  src,
  contentId,
  liveStreamId,
  poster,
  className = '',
  blurred = false,
  showPlayButton = true,
  isPremium = false,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Nettoyer le src des query strings pour la détection
  const cleanSrc = useMemo(() => src.split('?')[0], [src]);

  // Détecter si c'est une vraie URL R2 externe
  const isExternalR2 = isRealR2Url(cleanSrc);
  
  // Pour le contenu non-premium, construire l'URL publique directement (INSTANTANÉ)
  const publicUrl = useMemo(() => {
    if (!isPremium && !isExternalR2) {
      return buildPublicUrl(cleanSrc, 'content');
    }
    return null;
  }, [cleanSrc, isPremium, isExternalR2]);

  // Hook pour URLs R2 sécurisées - UNIQUEMENT pour le contenu premium R2
  const needsR2SignedUrl = isExternalR2 && isPremium;
  const { secureUrl: r2SecureUrl, loading: r2Loading } = useSecureR2Url(
    needsR2SignedUrl ? cleanSrc : null,
    { contentId, liveStreamId, enabled: needsR2SignedUrl }
  );

  // Hook pour URLs Supabase signées - UNIQUEMENT pour le contenu premium Supabase
  const needsSupabaseSignedUrl = !isExternalR2 && isPremium;
  const { signedUrl: supabaseSignedUrl, loading: supabaseLoading } = useSignedUrl(
    needsSupabaseSignedUrl ? cleanSrc : null,
    { bucket: 'content', contentId, enabled: needsSupabaseSignedUrl }
  );

  // URL finale - priorité absolue à l'URL publique pour le contenu gratuit (0ms latence)
  const secureVideoUrl = useMemo(() => {
    // Contenu gratuit = URL publique directe, pas de signature
    if (!isPremium && publicUrl) {
      return publicUrl;
    }
    // Contenu premium R2
    if (needsR2SignedUrl && r2SecureUrl) {
      return r2SecureUrl;
    }
    // Contenu premium Supabase
    if (needsSupabaseSignedUrl && supabaseSignedUrl) {
      return supabaseSignedUrl;
    }
    // Fallback: URL publique ou src original
    return publicUrl || buildPublicUrl(cleanSrc, 'content');
  }, [isPremium, publicUrl, needsR2SignedUrl, r2SecureUrl, needsSupabaseSignedUrl, supabaseSignedUrl, cleanSrc]);

  // Chargement uniquement pour le contenu premium
  const isLoading = isPremium && (needsR2SignedUrl ? r2Loading : (needsSupabaseSignedUrl ? supabaseLoading : false));

  // Construire l'URL du poster correctement
  const effectivePoster = useMemo(() => {
    if (!poster || poster.trim() === '') return undefined;
    // Si le poster est un chemin vidéo (même extension que src), ne pas l'utiliser
    const posterClean = poster.split('?')[0];
    if (posterClean.endsWith('.mp4') || posterClean.endsWith('.mov') || posterClean.endsWith('.webm')) {
      return undefined; // Le poster pointe vers une vidéo, pas une image
    }
    // Construire l'URL du poster
    if (posterClean.startsWith('http')) return poster;
    return buildPublicUrl(posterClean, 'content');
  }, [poster]);

  // IntersectionObserver pour précharger au viewport (200px avant)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '300px', threshold: 0.01 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Autoplay instantané au hover
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    const video = videoRef.current;
    if (video && !videoError && !blurred && secureVideoUrl) {
      video.currentTime = 0;
      // Play immédiat avec gestion silencieuse des erreurs
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Erreur de lecture silencieuse (ex: pas d'interaction utilisateur)
        });
      }
    }
  }, [videoError, blurred, secureVideoUrl]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted(prev => !prev);
  }, []);

  // Reset states quand l'URL change
  useEffect(() => {
    setVideoError(false);
    setVideoReady(false);
  }, [secureVideoUrl]);

  // Sync muted state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background gradient instantané (évite le flash blanc) */}
      <div className={`absolute inset-0 bg-gradient-to-br from-muted to-muted/50 transition-opacity duration-150 ${
        videoReady ? 'opacity-0' : 'opacity-100'
      }`} />

      {/* Poster image statique - seulement si c'est une vraie image */}
      {effectivePoster && (
        <img
          src={effectivePoster}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
            isHovering && videoReady && !blurred ? 'opacity-0' : 'opacity-100'
          } ${blurred ? 'blur-lg' : ''}`}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          loading="lazy"
        />
      )}

      {/* Video - préchargement avec preload="auto" pour lecture instantanée */}
      {secureVideoUrl && isInView && !isLoading && (
        <video
          ref={videoRef}
          src={secureVideoUrl}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
            (isHovering && videoReady && !blurred) ? 'opacity-100 z-10' : 
            (videoReady && !effectivePoster ? 'opacity-100' : 'opacity-0')
          } ${blurred ? 'blur-lg' : ''}`}
          muted={isMuted}
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onCanPlayThrough={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {/* Play button overlay - visible quand pas en hover */}
      {showPlayButton && !isHovering && !blurred && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 rounded-full p-3 shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Mute button pendant le hover */}
      {isHovering && !videoError && !blurred && videoReady && (
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

      {/* Loading indicator pour contenu premium uniquement */}
      {isLoading && isPremium && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Children overlay */}
      {children}
    </div>
  );
};

export default SecureVideoPreviewCard;
