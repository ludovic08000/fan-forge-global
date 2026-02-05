import { useRef, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ContentCard from '@/components/ContentCard';
import { Skeleton } from '@/components/ui/skeleton';
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
        .select('*, creators:creator_id(stage_name, user_id)')
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

  // Track local like counts for real-time UI updates
  const [localLikeCounts, setLocalLikeCounts] = useState<Record<string, number>>({});

  // Ref pour éviter les doubles clics
  const pendingLikesRef = useRef<Set<string>>(new Set());

  const handleLike = useCallback((contentId: string) => {
    // Éviter le double clic
    if (pendingLikesRef.current.has(contentId) || likeMutation.isPending) {
      return;
    }
    
    pendingLikesRef.current.add(contentId);
    
    likeMutation.mutate(contentId, {
      onSuccess: (result) => {
        pendingLikesRef.current.delete(contentId);
        // Update local like count for immediate UI feedback
        setLocalLikeCounts(prev => ({
          ...prev,
          [result.contentId]: result.like_count
        }));
        // Also update the query cache
        queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(item => 
            item.id === result.contentId 
              ? { ...item, like_count: result.like_count }
              : item
          );
        });
      },
      onError: () => {
        pendingLikesRef.current.delete(contentId);
      }
    });
  }, [likeMutation, queryClient, queryKey]);

  if (isLoading) {
    return (
      <div className="grid gap-0 grid-cols-3">
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
      <div className="grid gap-0 grid-cols-3">
        {content.map((item) => (
          <ContentCard 
            key={item.id} 
            content={item} 
            onLike={handleLike}
            isLiked={isContentLiked(item.id)}
            showCreatorInfo={false}
            compact={true}
            displayLikeCount={localLikeCounts[item.id]}
          />
        ))}
      </div>
    </div>
  );
};