import React, { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useSecureR2Url } from '@/hooks/useSecureR2Url';
import { useSignedUrl } from '@/hooks/useSignedUrl';

// Build public URL from relative path
const SUPABASE_URL = 'https://usjxcgauyvdocngfkhys.supabase.co';
const buildPublicUrl = (path: string, bucket: string = 'content'): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

// Check if it's a real R2 URL (not just a relative path)
const isRealR2Url = (url: string): boolean => {
  return url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com');
};

interface SecureVideoLightboxProps {
  src: string;
  contentId: string;
  isPremium?: boolean;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
}

/**
 * Composant vidéo sécurisé pour les lightbox/modals
 * Utilise des URLs signées pour les vidéos R2 et Supabase premium
 * Utilise des URLs publiques pour le contenu gratuit
 */
export const SecureVideoLightbox: React.FC<SecureVideoLightboxProps> = ({
  src,
  contentId,
  isPremium = false,
  className = '',
  autoPlay = true,
  controls = true,
}) => {
  const [videoError, setVideoError] = useState(false);

  // Détecter si c'est une vraie URL R2 externe (bucket privé Cloudflare)
  const isExternalR2 = isRealR2Url(src);

  // Pour le contenu non-premium, utiliser l'URL publique directement
  const publicUrl = useMemo(() => {
    if (!isPremium && !isExternalR2) {
      return buildPublicUrl(src, 'content');
    }
    return null;
  }, [src, isPremium, isExternalR2]);

  // Hook pour URLs R2 sécurisées - UNIQUEMENT pour le contenu R2 externe
  const needsR2SignedUrl = isExternalR2;
  const { secureUrl: r2SecureUrl, loading: r2Loading, error: r2Error } = useSecureR2Url(
    needsR2SignedUrl ? src : null,
    {
      contentId,
      enabled: needsR2SignedUrl
    }
  );

  // Hook pour URLs Supabase signées - UNIQUEMENT pour le contenu premium Supabase
  const needsSupabaseSignedUrl = !isExternalR2 && isPremium;
  const { signedUrl: supabaseSignedUrl, loading: supabaseLoading } = useSignedUrl(
    needsSupabaseSignedUrl ? src : null,
    {
      bucket: 'content',
      contentId,
      enabled: needsSupabaseSignedUrl
    }
  );

  // URL finale à utiliser
  const secureVideoUrl = useMemo(() => {
    // Non-premium: utiliser l'URL publique directement
    if (!isPremium && publicUrl) {
      return publicUrl;
    }
    // R2 externe (toujours privé)
    if (isExternalR2) {
      if (r2Loading) return '';
      if (r2Error) return '';
      return r2SecureUrl || '';
    }
    // Premium Supabase
    if (needsSupabaseSignedUrl) {
      if (supabaseLoading) return '';
      return supabaseSignedUrl || '';
    }
    // Fallback
    return publicUrl || src;
  }, [isPremium, publicUrl, isExternalR2, r2SecureUrl, needsSupabaseSignedUrl, supabaseSignedUrl, r2Loading, r2Error, supabaseLoading, src]);

  const isLoading = isExternalR2 ? r2Loading : (needsSupabaseSignedUrl ? supabaseLoading : false);

  // Reset error on URL change
  useEffect(() => {
    setVideoError(false);
  }, [secureVideoUrl]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-black/50 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2" />
          <p className="text-sm">Chargement sécurisé...</p>
        </div>
      </div>
    );
  }

  // Error state (only for R2 content or video playback errors)
  if ((isExternalR2 && r2Error) || videoError) {
    return (
      <div className={`flex items-center justify-center bg-black/50 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <div className="text-center text-white">
          <p className="text-red-400 mb-2">Erreur de chargement</p>
          <p className="text-sm text-white/60">{r2Error || 'Impossible de charger la vidéo'}</p>
        </div>
      </div>
    );
  }

  // No URL available yet
  if (!secureVideoUrl) {
    return (
      <div className={`flex items-center justify-center bg-black/50 rounded-lg ${className}`} style={{ minHeight: '300px' }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <video
      src={secureVideoUrl}
      controls={controls}
      autoPlay={autoPlay}
      className={className}
      playsInline
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      onError={(e) => {
        console.error('[SecureVideoLightbox] Video error:', e, 'URL:', secureVideoUrl);
        setVideoError(true);
      }}
    />
  );
};

export default SecureVideoLightbox;
