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
 * Utilisé dans les grilles de contenu où les items ont des chemins R2.
 */
export const SecureContentItem: React.FC<SecureContentItemProps> = ({
  item,
  canView,
  className = '',
}) => {
  const mediaUrl = item.thumbnail_url || item.file_url;
  const videoUrl = item.file_url;
  const needsR2 = isR2Url(item.content_type === 'video' ? videoUrl : mediaUrl);

  const { secureUrl, loading } = useSecureR2Url(
    item.content_type === 'video' ? videoUrl : mediaUrl,
    {
      contentId: item.id,
      enabled: needsR2,
    }
  );

  // For non-R2 content, use original URLs directly
  const resolvedUrl = needsR2 ? (secureUrl || '') : (item.content_type === 'video' ? videoUrl : mediaUrl);

  if (loading && needsR2) {
    return <div className={`w-full h-full bg-muted animate-pulse ${className}`} />;
  }

  if (!resolvedUrl) {
    return <div className={`w-full h-full bg-muted ${className}`} />;
  }

  if (item.content_type === 'video') {
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
