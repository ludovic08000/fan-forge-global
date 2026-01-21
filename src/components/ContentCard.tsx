import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, Lock, Euro } from 'lucide-react';
import { Content } from '@/hooks/useContent';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ReportContentDialog } from '@/components/ReportContentDialog';
import { ProtectedMedia } from '@/components/ProtectedMedia';
import { supabase } from '@/integrations/supabase/client';
import { preloadImage } from '@/components/ImageLightbox';
import LazyContentImage, { preloadImageFast } from '@/components/LazyContentImage';
import { SecureVideoPreviewCard } from '@/components/SecureVideoPreviewCard';

interface ContentCardProps {
  content: Content;
  onLike?: (contentId: string) => void;
  isLiked?: boolean;
  showCreatorInfo?: boolean;
  compact?: boolean;
  onOpenFreeImage?: (content: Content) => void;
  onOpenFreeVideo?: (content: Content) => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ 
  content, 
  onLike, 
  isLiked = false,
  showCreatorInfo = true,
  compact = false,
  onOpenFreeImage,
  onOpenFreeVideo,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Vérifier si l'utilisateur est abonné au créateur
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !content.creator_id) return;
      
      const { data } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', user.id)
        .eq('creator_id', content.creator_id)
        .eq('status', 'active')
        .maybeSingle();
      
      setIsSubscribed(!!data);
    };
    
    checkSubscription();
  }, [user, content.creator_id]);

  // Déterminer si le contenu doit être flouté
  const shouldBlur = content.is_premium && content.is_preview && !isSubscribed;

  const handleContentClick = () => {
    if (content.is_premium && !user) {
      toast.info('Connectez-vous pour voir ce contenu premium');
      navigate('/login');
      return;
    }

    if (content.is_premium && !isSubscribed) {
      // Rediriger vers la page d'abonnement
      navigate(`/creator/${content.creators?.user_id}/subscribe`);
      return;
    }

    // Contenu gratuit ou abonné
    if (content.content_type === 'video' && onOpenFreeVideo) {
      onOpenFreeVideo(content);
      return;
    }
    
    if (content.content_type !== 'video' && onOpenFreeImage) {
      onOpenFreeImage(content);
      return;
    }

    // Fallback navigation (ex: page dédiée)
    navigate(`/content/${content.id}`);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast.info('Connectez-vous pour liker ce contenu');
      navigate('/login');
      return;
    }
    onLike?.(content.id);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const creatorName = content.creators?.stage_name || 
                     content.creators?.profiles?.display_name || 
                     content.creators?.profiles?.username || 
                     'Créateur';

  const creatorInitials = creatorName.charAt(0).toUpperCase();

  // URL avec cache-buster - mémorisée
  const cacheBuster = useMemo(() => {
    return content.updated_at ? `?t=${new Date(content.updated_at).getTime()}` : '';
  }, [content.updated_at]);
  
  const imageUrl = useMemo(() => {
    return (content.thumbnail_url || content.file_url) + cacheBuster;
  }, [content.thumbnail_url, content.file_url, cacheBuster]);

  // URL vidéo séparée (utilise file_url, pas thumbnail)
  const videoUrl = useMemo(() => {
    return content.file_url + cacheBuster;
  }, [content.file_url, cacheBuster]);

  // Précharger agressivement au hover pour affichage instantané
  const handleMouseEnter = useCallback(() => {
    if (!content.is_premium || isSubscribed) {
      preloadImage(imageUrl); // Cache lightbox
      preloadImageFast(imageUrl); // Cache lazy image
    }
  }, [content.is_premium, isSubscribed, imageUrl]);

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden ${compact ? 'relative' : ''}`}
      onMouseEnter={handleMouseEnter}
    >
      {/* Media Container */}
      <ProtectedMedia 
        className="relative aspect-square bg-muted overflow-hidden cursor-pointer"
        watermarkText={content.is_premium ? creatorName : undefined}
        enableForensicWatermark={content.is_premium && isSubscribed}
        forensicOpacity={0.04}
      >
      <div onClick={handleContentClick}>
        {/* Premium Overlay pour contenu preview flouté */}
        {shouldBlur && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
            <div className="text-center text-white">
              <Lock className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Abonnez-vous pour voir</p>
            </div>
          </div>
        )}

        {/* Premium Overlay */}
        {content.is_premium && !content.is_preview && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-center text-white">
              <Lock className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Contenu Premium</p>
              {content.price > 0 && (
                <p className="text-xs">+ {formatPrice(content.price)}</p>
              )}
            </div>
          </div>
        )}

        {/* Media - chargement optimisé */}
        {content.content_type === 'video' ? (
          <SecureVideoPreviewCard
            src={videoUrl}
            contentId={content.id}
            poster={content.thumbnail_url ? content.thumbnail_url + cacheBuster : undefined}
            className="w-full h-full"
            blurred={shouldBlur}
            showPlayButton={!shouldBlur}
            isPremium={content.is_premium}
          />
        ) : (
          <LazyContentImage
            src={imageUrl}
            alt={content.title}
            className="group-hover:scale-105"
            blurred={shouldBlur}
          />
        )}

        {/* Premium Badge */}
        {content.is_premium && (
          <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground">
            <Lock className="h-3 w-3 mr-1" />
            {content.is_preview ? 'Aperçu' : 'Premium'}
          </Badge>
        )}

        {/* Video Duration (si disponible) */}
        {content.content_type === 'video' && content.duration && (
          <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/70 text-white">
            {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
          </Badge>
        )}
      </div>
      </ProtectedMedia>

      {/* Mode compact : overlay avec stats toujours visible */}
      {compact && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6"
        >
          <div className="flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {content.view_count}
            </span>
            <button 
              onClick={handleLike}
              className="flex items-center gap-1 hover:scale-110 transition-transform"
            >
              <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              {content.like_count}
            </button>
          </div>
        </div>
      )}

      {/* Mode normal avec CardContent et CardFooter */}
      {!compact && (
        <>
          <CardContent className="p-4">
            {/* Creator Info */}
            {showCreatorInfo && (
              <div className="flex items-center space-x-3 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={content.creators?.profiles?.avatar_url || ''} />
                  <AvatarFallback>{creatorInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{creatorName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(content.created_at)}</p>
                </div>
              </div>
            )}

            {/* Content Info */}
            <div className="space-y-2">
              <h3 className="font-medium line-clamp-2 leading-tight">
                {content.title}
              </h3>
              
              {content.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {content.description}
                </p>
              )}

              {/* Price */}
              {content.is_premium && content.price > 0 && (
                <div className="flex items-center space-x-1 text-primary">
                  <Euro className="h-4 w-4" />
                  <span className="font-medium">{formatPrice(content.price)}</span>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-0">
            {/* Stats & Actions */}
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{content.view_count}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{content.like_count}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={isLiked ? 'text-red-500 hover:text-red-600' : ''}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                </Button>
                
                <ReportContentDialog 
                  contentId={content.id} 
                  contentTitle={content.title}
                />
              </div>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default ContentCard;