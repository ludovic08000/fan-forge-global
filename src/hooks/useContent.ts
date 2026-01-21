import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Content {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  content_type: 'image' | 'video';
  file_url: string;
  thumbnail_url: string | null;
  is_premium: boolean;
  is_preview: boolean;
  price: number;
  status: 'draft' | 'published' | 'archived';
  view_count: number;
  like_count: number;
  duration: number | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
  creators?: {
    user_id: string;
    stage_name: string | null;
    profiles?: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

export const useContent = () => {
  const queryClient = useQueryClient();

  // Récupérer les likes de l'utilisateur connecté
  const { data: userLikes = [] } = useQuery({
    queryKey: ['user-likes'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('content_likes')
        .select('content_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return data?.map(like => like.content_id) || [];
    }
  });

  // Récupérer tout le contenu public et premium accessible
  const { data: contents, isLoading, error } = useQuery({
    queryKey: ['contents'],
    queryFn: async () => {
      // Récupérer les contenus avec les infos des créateurs
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          creators (
            user_id,
            stage_name
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (contentError) throw contentError;
      if (!contentData || contentData.length === 0) return [];

      // Récupérer les user_ids uniques des créateurs
      const userIds = [...new Set(contentData.map(c => c.creators?.user_id).filter(Boolean))];
      
      if (userIds.length === 0) return contentData;

      // Récupérer les profils correspondants
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Joindre manuellement les données
      const enrichedContent = contentData.map(content => {
        if (content.creators) {
          const profile = profiles?.find(p => p.user_id === content.creators?.user_id);
          return {
            ...content,
            creators: {
              ...content.creators,
              profiles: profile || null
            }
          };
        }
        return content;
      });

      return enrichedContent;
    }
  });

  // Helper pour vérifier si un contenu est liké
  const isContentLiked = (contentId: string) => userLikes.includes(contentId);

  // Récupérer le contenu d'un créateur spécifique
  const useCreatorContent = (creatorId: string | undefined | null) => {
    return useQuery({
      queryKey: ['creator-content', creatorId],
      queryFn: async () => {
        if (!creatorId) return [] as Content[];
        
        const { data, error } = await supabase
          .from('content')
          .select(`*`)
          .eq('creator_id', creatorId)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Content[];
      },
      enabled: !!creatorId // Ne pas exécuter si creatorId est vide
    });
  };

  // Récupérer le contenu d'un utilisateur (créateur)
  const useMyContent = () => {
    return useQuery({
      queryKey: ['my-content'],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Récupérer l'ID du créateur
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!creatorData) throw new Error('Not a creator');

        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('creator_id', creatorData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Content[];
      }
    });
  };

  // Liker un contenu
  const likeMutation = useMutation({
    mutationFn: async (contentId: string) => {
      // Utiliser la fonction SQL sécurisée
      const { data, error } = await supabase.rpc('toggle_content_like', {
        p_content_id: contentId
      });

      if (error) throw error;
      
      return { ...data as { liked: boolean; like_count: number }, contentId };
    },
    onMutate: async (contentId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['contents'] });
      await queryClient.cancelQueries({ queryKey: ['user-likes'] });
      await queryClient.cancelQueries({ queryKey: ['creator-content'] });
      
      // Snapshot the previous value
      const previousLikes = queryClient.getQueryData<string[]>(['user-likes']);
      const isCurrentlyLiked = previousLikes?.includes(contentId);
      
      // Optimistically update likes
      if (isCurrentlyLiked) {
        queryClient.setQueryData<string[]>(['user-likes'], (old) => 
          old?.filter(id => id !== contentId) || []
        );
      } else {
        queryClient.setQueryData<string[]>(['user-likes'], (old) => 
          [...(old || []), contentId]
        );
      }
      
      return { previousLikes, isCurrentlyLiked };
    },
    onSuccess: (data) => {
      // Force refetch to get accurate counts from server
      queryClient.invalidateQueries({ queryKey: ['contents'] });
      queryClient.invalidateQueries({ queryKey: ['creator-content'] });
    },
    onError: (error: any, _contentId, context) => {
      // Rollback on error
      if (context?.previousLikes) {
        queryClient.setQueryData(['user-likes'], context.previousLikes);
      }
      toast.error('Erreur lors du like : ' + error.message);
    }
  });

  // Enregistrer une vue
  const recordView = async (contentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('content_views')
        .insert({
          content_id: contentId,
          viewer_id: user?.id || null
        });

      // Récupérer le nombre actuel de vues
      const { data: currentContent } = await supabase
        .from('content')
        .select('view_count')
        .eq('id', contentId)
        .single();

      if (currentContent) {
        await supabase
          .from('content')
          .update({ view_count: currentContent.view_count + 1 })
          .eq('id', contentId);
      }
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  return {
    contents,
    isLoading,
    error,
    userLikes,
    isContentLiked,
    useCreatorContent,
    useMyContent,
    likeMutation,
    recordView
  };
};