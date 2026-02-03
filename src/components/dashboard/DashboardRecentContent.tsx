import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ImageIcon } from 'lucide-react';
import ContentCard from '@/components/ContentCard';
import { Content } from '@/hooks/useContent';

interface DashboardRecentContentProps {
  content: Content[] | undefined;
  isLoading: boolean;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onNewContent: () => void;
  onViewAll: () => void;
}

export const DashboardRecentContent: React.FC<DashboardRecentContentProps> = ({
  content,
  isLoading,
  onOpenLightbox,
  onEditContent,
  onNewContent,
  onViewAll,
}) => {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <h3 className="font-semibold text-lg">Derniers contenus</h3>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-muted-foreground hover:text-foreground">
          Voir tout →
        </Button>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : content && content.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
            {content.slice(0, 4).map((item, index) => (
              <ContentCard
                key={item.id}
                content={item}
                showCreatorInfo={false}
                compact={true}
                onOpenFreeImage={(c) => onOpenLightbox(c, index)}
                onOpenFreeVideo={(c) => onOpenLightbox(c, index)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground mb-3">Aucun contenu encore</p>
            <Button onClick={onNewContent} size="sm" className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter du contenu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardRecentContent;
