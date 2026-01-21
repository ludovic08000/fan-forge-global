import { useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ContentCard from '@/components/ContentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useContent } from '@/hooks/useContent';

interface OptimizedContentGalleryProps {
  creatorId?: string;
  contentType?: 'image' | 'video';
  pageSize?: number;
}

export const OptimizedContentGallery = ({
  creatorId,
  contentType,
  pageSize = 12,
}: OptimizedContentGalleryProps) => {
  const queryClient = useQueryClient();
  const { isContentLiked, likeMutation } = useContent();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Query key unique pour cette galerie
  const queryKey = ['gallery-content', creatorId, contentType];

  const { data: content = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('content')
        .select('*, creator:creator_id(stage_name, user_id)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // 30 secondes
  });

  const handleLike = useCallback((contentId: string) => {
    likeMutation.mutate(contentId, {
      onSuccess: (result) => {
        // Mise à jour optimiste du cache local de la galerie
        queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(item => 
            item.id === result.contentId 
              ? { ...item, like_count: result.like_count }
              : item
          );
        });
      }
    });
  }, [likeMutation, queryClient, queryKey]);

  if (isLoading) {
    return (
      <div className="grid gap-1.5 grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun contenu disponible
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-1.5 grid-cols-3">
        {content.map((item) => (
          <ContentCard 
            key={item.id} 
            content={item} 
            onLike={handleLike}
            isLiked={isContentLiked(item.id)}
            showCreatorInfo={false}
            compact={true}
          />
        ))}
      </div>
    </div>
  );
};