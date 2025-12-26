import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef } from 'react';

const MESSAGES_PER_PAGE = 30;

interface PrivateMessage {
  id: string;
  creator_id: string;
  subscriber_id: string;
  sender_id?: string | null;
  message_type: string;
  content: string | null;
  media_url: string | null;
  media_thumbnail: string | null;
  price: number | null;
  is_paid: boolean | null;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  status?: string;
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

      // Récupérer l'ID créateur de l'utilisateur actuel s'il en a un
      const { data: myCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const myCreatorId = myCreator?.id;
      
      // Construire le filtre pour couvrir tous les cas:
      // 1. Message du créateur cible vers moi (subscriber ou créateur)
      // 2. Message de moi (subscriber ou créateur) vers le créateur cible
      let filterParts: string[] = [];
      
      // Cas où je suis subscriber (user.id)
      filterParts.push(`and(creator_id.eq.${creatorId},subscriber_id.eq.${user.id})`);
      
      // Cas où le créateur cible est subscriber (improbable mais possible)
      if (myCreatorId) {
        filterParts.push(`and(creator_id.eq.${myCreatorId},subscriber_id.eq.${creatorId})`);
      }
      
      // Cas entre deux créateurs
      if (myCreatorId && myCreatorId !== creatorId) {
        filterParts.push(`and(creator_id.eq.${creatorId},subscriber_id.eq.${myCreatorId})`);
      }

      const { data, error } = await supabase
        .from('private_messages')
        .select(`
          id,
          creator_id,
          subscriber_id,
          sender_id,
          message_type,
          content,
          media_url,
          media_thumbnail,
          price,
          is_paid,
          created_at,
          updated_at,
          is_deleted,
          deleted_at,
          status
        `)
        .or(filterParts.join(','))
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return {
        messages: (data || []).reverse(),
        nextCursor: data && data.length === MESSAGES_PER_PAGE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!user && !!creatorId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const messages = data?.pages.flatMap(page => page.messages) ?? [];

  // Abonnement temps réel optimisé (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!user || !creatorId) return;

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
        },
        async (payload) => {
          const newMessage = payload.new as PrivateMessage;
          
          // Récupérer l'ID créateur de l'utilisateur actuel
          const { data: myCreator } = await supabase
            .from('creators')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const myCreatorId = myCreator?.id;
          
          // Vérifier si le message concerne cette conversation
          // Cas 1: Je suis subscriber, message entre moi et le créateur cible
          const isSubscriberConversation = 
            newMessage.creator_id === creatorId && newMessage.subscriber_id === user.id;
          
          // Cas 2: Je suis créateur, message entre moi (créateur) et l'abonné (creatorId = targetId qui est l'abonné ici)
          const isCreatorConversation = 
            myCreatorId && (
              (newMessage.creator_id === myCreatorId && newMessage.subscriber_id === creatorId) ||
              (newMessage.creator_id === creatorId && newMessage.subscriber_id === myCreatorId)
            );
          
          if (!isSubscriberConversation && !isCreatorConversation) return;
          
          queryClient.setQueryData(
            ['private-messages', creatorId, user.id],
            (old: any) => {
              if (!old?.pages?.length) return old;
              
              const allMessages = old.pages.flatMap((p: any) => p.messages);
              // Vérifier les doublons par ID ou par ID temporaire
              if (allMessages.some((m: PrivateMessage) => 
                m.id === newMessage.id || 
                (m.id.startsWith('temp-') && m.content === newMessage.content && m.created_at)
              )) {
                // Remplacer le message temporaire par le vrai message
                const newPages = old.pages.map((page: any) => ({
                  ...page,
                  messages: page.messages.map((m: PrivateMessage) =>
                    m.id.startsWith('temp-') && m.content === newMessage.content ? newMessage : m
                  ),
                }));
                return { ...old, pages: newPages };
              }

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
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          const deletedMessage = payload.old as { id: string };
          
          queryClient.setQueryData(
            ['private-messages', creatorId, user.id],
            (old: any) => {
              if (!old?.pages?.length) return old;
              
              const newPages = old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.filter((m: PrivateMessage) => m.id !== deletedMessage.id),
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
    mutationFn: async ({ content, creatorId: targetId }: { content: string; creatorId: string }) => {
      if (!user) throw new Error('Non authentifié');

      // Vérifier si je suis un créateur
      const { data: myCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Vérifier si la cible est un créateur (pour déterminer son creator.id)
      const { data: targetCreator } = await supabase
        .from('creators')
        .select('id, user_id')
        .or(`id.eq.${targetId},user_id.eq.${targetId}`)
        .maybeSingle();

      let messageData;
      
      if (myCreator) {
        // Je suis créateur - j'envoie à un subscriber (ou un autre créateur)
        // targetId peut être un user_id (subscriber) ou un creator.id
        const subscriberUserId = targetCreator?.user_id || targetId;
        messageData = {
          creator_id: myCreator.id,
          subscriber_id: subscriberUserId,
          sender_id: user.id,
          message_type: 'text' as const,
          content,
          status: 'sent',
        };
      } else {
        // Je suis subscriber - j'envoie à un créateur
        // targetId est le creator.id
        messageData = {
          creator_id: targetId,
          subscriber_id: user.id,
          sender_id: user.id,
          message_type: 'text' as const,
          content,
          status: 'sent',
        };
      }

      const { data, error } = await supabase
        .from('private_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ content, creatorId: targetCreatorId }) => {
      await queryClient.cancelQueries({ queryKey: ['private-messages', creatorId, user?.id] });

      const previousMessages = queryClient.getQueryData(['private-messages', creatorId, user?.id]);

      const optimisticMessage: PrivateMessage = {
        id: `temp-${Date.now()}`,
        creator_id: creatorId || targetCreatorId,
        subscriber_id: user?.id || '',
        sender_id: user?.id || '',
        message_type: 'text',
        content,
        media_url: null,
        media_thumbnail: null,
        price: null,
        is_paid: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        status: 'sending',
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
      if (context?.previousMessages) {
        queryClient.setQueryData(['private-messages', creatorId, user?.id], context.previousMessages);
      }
      toast.error(`Erreur lors de l'envoi: ${err.message}`);
    },
  });

  // Envoyer du contenu média payant (créateur vers abonné)
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

      // targetCreatorId peut être un user_id du subscriber
      // Vérifier s'il correspond à un créateur
      const { data: targetCreator } = await supabase
        .from('creators')
        .select('id, user_id')
        .or(`id.eq.${targetCreatorId},user_id.eq.${targetCreatorId}`)
        .maybeSingle();

      const subscriberUserId = targetCreator?.user_id || targetCreatorId;

      const messageData = {
        creator_id: creator.id,
        subscriber_id: subscriberUserId,
        sender_id: user.id,
        message_type: messageType,
        media_url: mediaUrl,
        media_thumbnail: thumbnailUrl,
        price,
        is_paid: false,
        status: 'sent',
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

  // Envoyer une demande de média (abonné vers créateur)
  // L'abonné soumet son média avec message_type = 'media_request' et status = 'pending'
  const sendMediaRequest = useMutation({
    mutationFn: async ({ 
      mediaUrl, 
      thumbnailUrl, 
      creatorId: targetCreatorId,
      messageType 
    }: { 
      mediaUrl: string; 
      thumbnailUrl?: string; 
      creatorId: string;
      messageType: 'video' | 'image';
    }) => {
      if (!user) throw new Error('Non authentifié');

      const messageData = {
        creator_id: targetCreatorId,
        subscriber_id: user.id,
        sender_id: user.id,
        message_type: `${messageType}_request`, // 'image_request' ou 'video_request'
        media_url: mediaUrl,
        media_thumbnail: thumbnailUrl,
        price: null, // Le créateur fixera le prix
        is_paid: false,
        status: 'pending', // En attente d'acceptation par le créateur
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
      toast.success('Demande envoyée ! Le créateur va définir un prix.');
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'envoi: ${error.message}`);
    },
  });

  // Répondre à une demande de média (créateur accepte/refuse)
  const respondToMediaRequest = useMutation({
    mutationFn: async ({ 
      messageId, 
      action, 
      price 
    }: { 
      messageId: string; 
      action: 'accept' | 'reject';
      price?: number;
    }) => {
      if (!user) throw new Error('Non authentifié');

      // Vérifier que l'utilisateur est bien le créateur de ce message
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creator) throw new Error('Seuls les créateurs peuvent répondre aux demandes');

      const updateData = action === 'accept' 
        ? { status: 'price_set', price: price || 0 }
        : { status: 'rejected' };

      const { data, error } = await supabase
        .from('private_messages')
        .update(updateData)
        .eq('id', messageId)
        .eq('creator_id', creator.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'accept' ? 'Prix fixé ! En attente de paiement.' : 'Demande refusée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Payer pour une demande de média (abonné paie pour que le créateur voie son contenu)
  const payForMediaRequest = useMutation({
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

  // Supprimer un message (soft delete - seul l'auteur peut supprimer)
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Non authentifié');

      // Récupérer le message pour vérifier l'auteur
      const { data: message, error: fetchError } = await supabase
        .from('private_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;
      if (!message) throw new Error('Message non trouvé');

      // Vérifier que l'utilisateur est l'auteur du message
      const { data: userCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const isAuthor = userCreator 
        ? (message.creator_id === userCreator.id && message.message_type !== 'text') ||
          (message.subscriber_id === user.id && message.message_type === 'text')
        : message.subscriber_id === user.id;

      if (!isAuthor) {
        throw new Error('Vous ne pouvez supprimer que vos propres messages');
      }

      const { error } = await supabase
        .from('private_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: null,
          media_url: null,
          media_thumbnail: null,
        })
        .eq('id', messageId);

      if (error) throw error;
      return { messageId };
    },
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: ['private-messages', creatorId, user?.id] });

      const previousMessages = queryClient.getQueryData(['private-messages', creatorId, user?.id]);

      // Update optimiste
      queryClient.setQueryData(
        ['private-messages', creatorId, user?.id],
        (old: any) => {
          if (!old?.pages?.length) return old;
          
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: PrivateMessage) =>
              m.id === messageId 
                ? { ...m, is_deleted: true, deleted_at: new Date().toISOString(), content: null, media_url: null }
                : m
            ),
          }));
          return { ...old, pages: newPages };
        }
      );

      return { previousMessages };
    },
    onError: (err, _, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['private-messages', creatorId, user?.id], context.previousMessages);
      }
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success('Message supprimé');
    },
  });

  // Marquer les messages comme lus
  const markAsRead = useMutation({
    mutationFn: async (messageIds: string[]) => {
      if (!user || messageIds.length === 0) return;

      const { error } = await supabase
        .from('private_messages')
        .update({ status: 'read' })
        .in('id', messageIds)
        .neq('status', 'read');

      if (error) throw error;
    },
  });

  // Charger plus de messages
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
    sendMediaRequest,
    respondToMediaRequest,
    payForContent,
    payForMediaRequest,
    deleteMessage,
    markAsRead,
  };
};
