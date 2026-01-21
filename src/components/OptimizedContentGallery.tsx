import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ContentCard from '@/components/ContentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { isContentLiked, likeMutation } = useContent();

  const handleLike = (contentId: string) => {
    likeMutation.mutate(contentId);
  };

  const fetchContent = useCallback(async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      let query = supabase
        .from('content')
        .select('*, creator:creator_id(stage_name, user_id)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (append) {
        setContent((prev) => [...prev, ...(data || [])]);
      } else {
        setContent(data || []);
      }

      setHasMore((data?.length || 0) === pageSize);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [creatorId, contentType, pageSize]);

  useEffect(() => {
    fetchContent(0, false);
  }, [fetchContent]);

  // Intersection Observer pour infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchContent(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, page, fetchContent]);

  if (loading) {
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

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Chargement...</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && content.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Vous avez tout vu !
        </div>
      )}
    </div>
  );
};
