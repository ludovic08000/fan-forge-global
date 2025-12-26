import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef } from 'react';

const MESSAGES_PER_PAGE = 30;

interface PrivateMessage {
  id: string;
  creator_id: string;
  subscriber_id: string;
  message_type: string;
  content: string | null;
  media_url: string | null;
  media_thumbnail: string | null;
  price: number | null;
  is_paid: boolean | null;
  created_at: string;
  updated_at: string;
  creator?: { stage_name: string | null; user_id: string };
  subscriber?: { display_name: string | null; avatar_url: string | null };
}

export const usePrivateMessages = (creatorId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Query paginée avec infinite scroll
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['private-messages', creatorId, user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user || !creatorId) return { messages: [], nextCursor: null };
      
      const from = pageParam * MESSAGES_PER_PAGE;
      const to = from + MESSAGES_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('private_messages')
        .select(`
          id,
          creator_id,
          subscriber_id,
          message_type,
          content,
          media_url,
          media_thumbnail,
          price,
          is_paid,
          created_at,
          updated_at
        `)
        .or(`and(creator_id.eq.${creatorId},subscriber_id.eq.${user.id}),and(creator_id.eq.${user.id},subscriber_id.eq.${creatorId})`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return {
        messages: (data || []).reverse(), // Reverse pour avoir l'ordre chronologique
        nextCursor: data && data.length === MESSAGES_PER_PAGE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!user && !!creatorId,
    staleTime: 30000, // Cache pendant 30s
    gcTime: 5 * 60 * 1000, // Garde en cache 5 min
  });

  // Aplatir les messages de toutes les pages
  const messages = data?.pages.flatMap(page => page.messages) ?? [];

  // Abonnement temps réel optimisé
  useEffect(() => {
    if (!user || !creatorId) return;

    // Cleanup ancien abonnement
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`private-messages-${creatorId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `or(and(creator_id.eq.${creatorId},subscriber_id.eq.${user.id}),and(creator_id.eq.${user.id},subscriber_id.eq.${creatorId}))`,
        },
        (payload) => {
          const newMessage = payload.new as PrivateMessage;
          
          // Update optimiste - ajoute le message directement au cache
          queryClient.setQueryData(
            ['private-messages', creatorId, user.id],
            (old: any) => {
              if (!old?.pages?.length) return old;
              
              // Vérifie si le message existe déjà (évite les doublons)
              const allMessages = old.pages.flatMap((p: any) => p.messages);
              if (allMessages.some((m: PrivateMessage) => m.id === newMessage.id)) {
                return old;
              }

              // Ajoute à la première page (messages les plus récents)
              const newPages = [...old.pages];
              newPages[0] = {
                ...newPages[0],
                messages: [...newPages[0].messages, newMessage],
              };
              return { ...old, pages: newPages };
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          const updatedMessage = payload.new as PrivateMessage;
          
          // Update le message dans le cache
          queryClient.setQueryData(
            ['private-messages', creatorId, user.id],
            (old: any) => {
              if (!old?.pages?.length) return old;
              
              const newPages = old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((m: PrivateMessage) =>
                  m.id === updatedMessage.id ? updatedMessage : m
                ),
              }));
              return { ...old, pages: newPages };
            }
          );
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [user?.id, creatorId, queryClient]);

  // Envoyer un message texte avec update optimiste
  const sendMessage = useMutation({
    mutationFn: async ({ content, creatorId: targetCreatorId }: { content: string; creatorId: string }) => {
      if (!user) throw new Error('Non authentifié');

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const messageData = creator
        ? {
            creator_id: creator.id,
            subscriber_id: targetCreatorId,
            message_type: 'text' as const,
            content,
          }
        : {
            creator_id: targetCreatorId,
            subscriber_id: user.id,
            message_type: 'text' as const,
            content,
          };

      const { data, error } = await supabase
        .from('private_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ content, creatorId: targetCreatorId }) => {
      // Cancel les queries en cours
      await queryClient.cancelQueries({ queryKey: ['private-messages', creatorId, user?.id] });

      // Snapshot du cache actuel
      const previousMessages = queryClient.getQueryData(['private-messages', creatorId, user?.id]);

      // Update optimiste
      const optimisticMessage: PrivateMessage = {
        id: `temp-${Date.now()}`,
        creator_id: creatorId || targetCreatorId,
        subscriber_id: user?.id || '',
        message_type: 'text',
        content,
        media_url: null,
        media_thumbnail: null,
        price: null,
        is_paid: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ['private-messages', creatorId, user?.id],
        (old: any) => {
          if (!old?.pages?.length) {
            return { pages: [{ messages: [optimisticMessage], nextCursor: null }], pageParams: [0] };
          }
          const newPages = [...old.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [...newPages[0].messages, optimisticMessage],
          };
          return { ...old, pages: newPages };
        }
      );

      return { previousMessages };
    },
    onError: (err, _, context) => {
      // Rollback en cas d'erreur
      if (context?.previousMessages) {
        queryClient.setQueryData(['private-messages', creatorId, user?.id], context.previousMessages);
      }
      toast.error(`Erreur lors de l'envoi: ${err.message}`);
    },
    onSettled: () => {
      // Pas d'invalidation - le realtime gère la synchro
    },
  });

  // Envoyer du contenu média payant
  const sendPaidContent = useMutation({
    mutationFn: async ({ 
      mediaUrl, 
      thumbnailUrl, 
      price, 
      creatorId: targetCreatorId,
      messageType 
    }: { 
      mediaUrl: string; 
      thumbnailUrl?: string; 
      price: number; 
      creatorId: string;
      messageType: 'video' | 'image';
    }) => {
      if (!user) throw new Error('Non authentifié');

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creator) throw new Error('Seuls les créateurs peuvent envoyer du contenu payant');

      const messageData = {
        creator_id: creator.id,
        subscriber_id: targetCreatorId,
        message_type: messageType,
        media_url: mediaUrl,
        media_thumbnail: thumbnailUrl,
        price,
        is_paid: false,
      };

      const { data, error } = await supabase
        .from('private_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Contenu envoyé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'envoi: ${error.message}`);
    },
  });

  // Payer pour du contenu privé
  const payForContent = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('pay-private-content', {
        body: { messageId },
      });

      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
      
      return data;
    },
    onError: (error) => {
      toast.error(`Erreur lors du paiement: ${error.message}`);
    },
  });

  // Charger plus de messages (pour infinite scroll)
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    messages,
    isLoading,
    hasMore: hasNextPage,
    loadMore,
    isFetchingMore: isFetchingNextPage,
    sendMessage,
    sendPaidContent,
    payForContent,
  };
};
