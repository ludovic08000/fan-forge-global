import React from 'react';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { SecureVideoPreviewCard } from '@/components/SecureVideoPreviewCard';

interface SecureContentItemProps {
  item: {
    id: string;
    file_url: string;
    thumbnail_url?: string | null;
    content_type: string;
    title: string;
    is_premium?: boolean;
    duration?: number;
  };
  canView: boolean;
  className?: string;
}

/**
 * Composant qui résout automatiquement les URLs R2 avant d'afficher images/vidéos.
 * Pour les vidéos : affiche la miniature si disponible, sinon charge la vidéo.
 */
export const SecureContentItem: React.FC<SecureContentItemProps> = ({
  item,
  canView,
  className = '',
}) => {
  const isVideo = item.content_type === 'video';
  
  // Pour les vidéos avec miniature, utiliser la miniature dans la grille (plus performant)
  const hasThumbnail = isVideo && !!item.thumbnail_url;
  
  // URL à résoudre : miniature pour vidéos avec thumbnail, sinon file_url
  const urlToResolve = hasThumbnail 
    ? item.thumbnail_url! 
    : (item.thumbnail_url || item.file_url);
  
  // URL vidéo séparée pour les vidéos sans miniature
  const videoUrl = isVideo && !hasThumbnail ? item.file_url : null;
  
  const needsR2 = isR2Url(videoUrl || urlToResolve);

  const { secureUrl, loading } = useSecureR2Url(
    videoUrl || urlToResolve,
    {
      contentId: item.id,
      enabled: needsR2,
    }
  );

  // For non-R2 content, use original URLs directly
  const resolvedUrl = needsR2 
    ? (secureUrl || '') 
    : (videoUrl || urlToResolve);

  // Aussi résoudre la miniature si on charge la vidéo
  const thumbnailNeedsR2 = hasThumbnail && isR2Url(item.thumbnail_url);
  const { secureUrl: thumbnailUrl } = useSecureR2Url(
    hasThumbnail ? item.thumbnail_url! : null,
    {
      contentId: item.id,
      enabled: hasThumbnail && thumbnailNeedsR2,
    }
  );

  if (loading && needsR2) {
    return <div className={`w-full h-full bg-muted animate-pulse ${className}`} />;
  }

  if (!resolvedUrl) {
    return <div className={`w-full h-full bg-muted ${className}`} />;
  }

  // Vidéo avec miniature → afficher l'image miniature (comme Instagram/TikTok)
  if (isVideo && hasThumbnail) {
    const thumbSrc = thumbnailNeedsR2 ? (thumbnailUrl || '') : item.thumbnail_url!;
    if (!thumbSrc) {
      return <div className={`w-full h-full bg-muted ${className}`} />;
    }
    return (
      <OptimizedImage
        src={thumbSrc}
        alt={item.title}
        className={`w-full h-full object-cover transition-transform ${
          canView ? 'group-hover:scale-105' : 'blur-lg'
        } ${className}`}
      />
    );
  }

  // Vidéo sans miniature → lecteur vidéo avec fallback
  if (isVideo) {
    return (
      <SecureVideoPreviewCard
        src={resolvedUrl}
        contentId={item.id}
        poster={null}
        className={`w-full h-full object-cover ${className}`}
        blurred={!canView}
        showPlayButton={false}
        isPremium={item.is_premium}
      />
    );
  }

  // Image
  return (
    <OptimizedImage
      src={resolvedUrl}
      alt={item.title}
      className={`w-full h-full object-cover transition-transform ${
        canView ? 'group-hover:scale-105' : 'blur-lg'
      } ${className}`}
    />
  );
};

export default SecureContentItem;