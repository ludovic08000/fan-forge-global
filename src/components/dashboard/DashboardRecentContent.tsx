import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Heart, Wand2, Plus, ImageIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface Content {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  content_type: string;
  view_count: number | null;
  like_count: number | null;
}

interface DashboardRecentContentProps {
  content: Content[] | undefined;
  isLoading: boolean;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onNewContent: () => void;
  onViewAll: () => void;
}

const SUPABASE_URL = 'https://usjxcgauyvdocngfkhys.supabase.co';

const isRelativePath = (url: string): boolean => {
  return !url.startsWith('http://') && !url.startsWith('https://');
};

const buildPublicUrl = (path: string, bucket: string = 'content'): string => {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

const getDisplayUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (isRelativePath(url)) {
    return buildPublicUrl(url, 'content');
  }
  return url;
};

export const DashboardRecentContent: React.FC<DashboardRecentContentProps> = ({
  content,
  isLoading,
  onOpenLightbox,
  onEditContent,
  onNewContent,
  onViewAll,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <h3 className="font-semibold text-lg">{t('dashboard.recentContent')}</h3>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-muted-foreground hover:text-foreground">
          {t('dashboard.viewAll')} →
        </Button>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : content && content.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {content.slice(0, 4).map((item, index) => (
              <div 
                key={item.id} 
                className="aspect-square rounded-xl overflow-hidden bg-muted relative group cursor-pointer ring-1 ring-border/50 hover:ring-primary/50 transition-all"
                onClick={() => onOpenLightbox(item, index)}
              >
                <img
                  src={getDisplayUrl(item.thumbnail_url) || getDisplayUrl(item.file_url) || ''}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                  <div className="text-white text-xs flex items-center gap-3">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.view_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{item.like_count || 0}</span>
                  </div>
                </div>
                {item.content_type === 'image' && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditContent(item);
                    }}
                  >
                    <Wand2 className="h-3.5 w-3.5 text-primary" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground mb-3">{t('dashboard.noContentYet')}</p>
            <Button onClick={onNewContent} size="sm" className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.addContent')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardRecentContent;
