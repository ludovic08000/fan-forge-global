import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Heart, Wand2, Plus, Upload, Trash2, Play, Video, Crown, Volume2, VolumeX, Shield } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface Content {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  content_type: string;
  view_count: number | null;
  like_count: number | null;
  is_premium: boolean | null;
}

interface DashboardContentGridProps {
  content: Content[] | undefined;
  isLoading: boolean;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onDeleteContent: (contentId: string) => void;
  onNewContent: () => void;
}

// Composant pour une carte de contenu avec preview vidéo sécurisée
const SecureContentCard: React.FC<{
  item: Content;
  index: number;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onDeleteContent: (contentId: string) => void;
}> = ({ item, index, onOpenLightbox, onEditContent, onDeleteContent }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  
  const isVideo = item.content_type === 'video';
  const isReplay = item.title?.toLowerCase().includes('replay');
  const isPremium = item.is_premium === true;
  const isExternalUrl = item.file_url?.startsWith('https://') && !item.file_url?.includes('supabase.co');

  // Utiliser des URLs signées pour le contenu premium
  const { signedUrl, loading: urlLoading } = useSignedUrl(
    isVideo ? item.file_url : null,
    {
      bucket: 'content',
      contentId: item.id,
      enabled: isVideo && isPremium
    }
  );

  // URL sécurisée à utiliser
  const secureVideoUrl = isPremium ? signedUrl : item.file_url;

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && isVideo && secureVideoUrl && !videoError) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setVideoError(true);
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
    setIsMuted(!isMuted);
  };

  // Reset error state when URL changes
  useEffect(() => {
    setVideoError(false);
  }, [secureVideoUrl]);

  return (
    <Card className="overflow-hidden group card-premium">
      <div 
        className="aspect-square bg-muted overflow-hidden relative cursor-pointer"
        onClick={() => onOpenLightbox(item, index)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Video player pour les vidéos */}
        {isVideo && (
          <>
            {/* Loading state pour URL signée */}
            {urlLoading && isPremium && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {/* Video element sécurisé - toujours présent mais caché quand pas en hover */}
            {secureVideoUrl && !videoError && (
              <video
                ref={videoRef}
                src={secureVideoUrl}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isHovering ? 'opacity-100' : 'opacity-0'
                }`}
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                // crossOrigin seulement pour Supabase, pas pour R2 externe
                {...(!isExternalUrl && { crossOrigin: "anonymous" })}
                onError={() => setVideoError(true)}
                // Protection contre le téléchargement
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                style={{ pointerEvents: isHovering ? 'auto' : 'none' }}
              />
            )}
            
            {/* Overlay statique quand pas en hover */}
            <div className={`absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 via-background to-primary/10 flex flex-col items-center justify-center transition-opacity duration-300 ${
              isHovering && !videoError ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(var(--primary)) 2px, transparent 2px)',
                  backgroundSize: '20px 20px'
                }} />
              </div>
              
              {/* Play button premium */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" fill="currentColor" />
                </div>
                
                {isReplay && (
                  <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
                    <Video className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Replay Live</span>
                  </div>
                )}
              </div>
            </div>

            {/* Indicateur de contenu sécurisé */}
            {isPremium && isHovering && !videoError && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-green-500/90 px-2 py-0.5 rounded-full">
                <Shield className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">Sécurisé</span>
              </div>
            )}

            {/* Mute button pendant le hover */}
            {isHovering && !videoError && secureVideoUrl && (
              <button
                onClick={toggleMute}
                className="absolute bottom-2 left-2 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-white" />
                ) : (
                  <Volume2 className="h-4 w-4 text-white" />
                )}
              </button>
            )}

            {/* Premium badge overlay */}
            {isPremium && !isHovering && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-full z-10">
                <Crown className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">Premium</span>
              </div>
            )}
          </>
        )}

        {/* Image pour les contenus non-vidéo */}
        {!isVideo && (
          <img
            src={item.thumbnail_url || item.file_url}
            alt={item.title}
            className="w-full h-full object-cover"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        )}
        
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          {item.content_type === 'image' && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onEditContent(item);
              }}
            >
              <Wand2 className="h-4 w-4 text-primary" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteContent(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.view_count || 0}</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{item.like_count || 0}</span>
          </div>
          <Badge variant={isPremium ? "default" : "secondary"} className="text-[10px]">
            {isPremium ? 'Premium' : 'Gratuit'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardContentGrid: React.FC<DashboardContentGridProps> = ({
  content,
  isLoading,
  onOpenLightbox,
  onEditContent,
  onDeleteContent,
  onNewContent,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mon contenu</h2>
        <Badge variant="outline">{content?.length || 0} contenu{(content?.length || 0) > 1 ? 's' : ''}</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : content && content.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {content.map((item, index) => (
            <SecureContentCard
              key={item.id}
              item={item}
              index={index}
              onOpenLightbox={onOpenLightbox}
              onEditContent={onEditContent}
              onDeleteContent={onDeleteContent}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Aucun contenu</h3>
          <p className="text-muted-foreground mb-4">Commencez à partager avec votre audience</p>
          <Button onClick={onNewContent} variant="premium">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter du contenu
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardContentGrid;
