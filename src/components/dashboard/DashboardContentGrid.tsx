import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Plus, Upload, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ContentCard from '@/components/ContentCard';
import { Content } from '@/hooks/useContent';

interface DashboardContentGridProps {
  content: Content[] | undefined;
  isLoading: boolean;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onDeleteContent: (contentId: string) => void;
  onNewContent: () => void;
}

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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0 w-full">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      ) : content && content.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0">
          {content.map((item, index) => (
            <div key={item.id} className="relative group">
              {/* ContentCard identique à ce que voient les utilisateurs */}
              <ContentCard
                content={item}
                showCreatorInfo={false}
                compact={true}
                onOpenFreeImage={(c) => onOpenLightbox(c, index)}
                onOpenFreeVideo={(c) => onOpenLightbox(c, index)}
              />
              
              {/* Actions créateur en overlay */}
              <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.content_type === 'image' && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
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
                  className="h-8 w-8 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteContent(item.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
