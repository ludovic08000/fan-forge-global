import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Heart, Wand2, Plus, Upload, Trash2, Crown } from 'lucide-react';
import { SecureVideoPreviewCard } from '@/components/SecureVideoPreviewCard';

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

// Composant unifié pour une carte de contenu - même comportement côté créateur et utilisateur
const ContentCard: React.FC<{
  item: Content;
  index: number;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onDeleteContent: (contentId: string) => void;
}> = ({ item, index, onOpenLightbox, onEditContent, onDeleteContent }) => {
  const isVideo = item.content_type === 'video';
  const isPremium = item.is_premium === true;

  return (
    <Card className="overflow-hidden group card-premium">
      <div 
        className="aspect-square bg-muted overflow-hidden relative cursor-pointer"
        onClick={() => onOpenLightbox(item, index)}
      >
        {/* Video avec SecureVideoPreviewCard unifié - lecture instantanée au hover */}
        {isVideo ? (
          <SecureVideoPreviewCard
            src={item.file_url}
            contentId={item.id}
            poster={item.thumbnail_url}
            className="w-full h-full"
            isPremium={isPremium}
            showPlayButton={true}
          >
            {/* Premium badge */}
            {isPremium && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-full z-20">
                <Crown className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">Premium</span>
              </div>
            )}
          </SecureVideoPreviewCard>
        ) : (
          /* Image */
          <>
            <img
              src={item.thumbnail_url || item.file_url}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
              loading="lazy"
            />
            {isPremium && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-full z-10">
                <Crown className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">Premium</span>
              </div>
            )}
          </>
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
            <ContentCard
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
