/**
 * Hook pour gérer les conversations privées en temps réel
 * Supporte les messages texte, médias payants, emojis et notifications sonores
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChatNotificationSound } from '@/hooks/useChatNotificationSound';
import { toast } from 'sonner';

export interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar?: string;
  participant_stage_name?: string;
  last_message?: string;
  last_message_type: 'text' | 'image' | 'video';
  last_message_time: string;
  unread_count: number;
  is_creator: boolean;
}

export interface Message {
  id: string;
  creator_id: string;
  subscriber_id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'video';
  media_url: string | null;
  media_thumbnail: string | null;
  price: number;
  is_paid: boolean;
  created_at: string;
  is_from_me: boolean;
}

export const useConversations = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { playNotificationSound } = useChatNotificationSound();
  const initialLoadDoneRef = useRef(false);

  // Récupérer toutes les conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Récupérer le creator_id si l'utilisateur est un créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const isCreator = !!creatorData;
      const creatorId = creatorData?.id;

      // Récupérer tous les messages privés pour cet utilisateur
      let query = supabase
        .from('private_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (isCreator && creatorId) {
        query = query.eq('creator_id', creatorId);
      } else {
        query = query.eq('subscriber_id', user.id);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      // Grouper par conversation (par participant unique)
      const conversationMap = new Map<string, any>();

      for (const msg of messages || []) {
        const participantId = isCreator ? msg.subscriber_id : msg.creator_id;
        
        if (!conversationMap.has(participantId)) {
          conversationMap.set(participantId, {
            participant_id: participantId,
            last_message: msg.content || (msg.message_type === 'image' ? '📷 Photo' : '🎬 Vidéo'),
            last_message_type: msg.message_type,
            last_message_time: msg.created_at,
            unread_count: 0,
          });
        }
      }

      // Récupérer les infos des participants
      const participantIds = Array.from(conversationMap.keys());
      const conversationsData: Conversation[] = [];

      for (const participantId of participantIds) {
        const convData = conversationMap.get(participantId);
        
        if (isCreator) {
          // Le participant est un subscriber (user_id dans profiles)
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, username')
            .eq('user_id', participantId)
            .maybeSingle();

          conversationsData.push({
            id: participantId,
            participant_id: participantId,
            participant_name: profile?.display_name || profile?.username || 'Utilisateur',
            participant_avatar: profile?.avatar_url,
            is_creator: false,
            ...convData,
          });
        } else {
          // Le participant est un créateur
          const { data: creator } = await supabase
            .from('creators')
            .select('stage_name, user_id')
            .eq('id', participantId)
            .maybeSingle();

          if (creator) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('user_id', creator.user_id)
              .maybeSingle();

            conversationsData.push({
              id: participantId,
              participant_id: participantId,
              participant_name: creator.stage_name || 'Créateur',
              participant_stage_name: creator.stage_name,
              participant_avatar: profile?.avatar_url,
              is_creator: true,
              ...convData,
            });
          }
        }
      }

      // Trier par date du dernier message
      return conversationsData.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );
    },
    enabled: !!user,
  });

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('private-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Vérifier si le message nous concerne
          const isForMe = newMessage.subscriber_id === user.id || 
            (userRole === 'creator' && newMessage.creator_id);
          
          if (isForMe && initialLoadDoneRef.current) {
            // Jouer le son de notification si ce n'est pas notre message
            const isFromMe = newMessage.subscriber_id === user.id && userRole !== 'creator';
            if (!isFromMe) {
              playNotificationSound();
            }
            
            // Rafraîchir les conversations
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      )
      .subscribe();

    initialLoadDoneRef.current = true;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole, queryClient, playNotificationSound]);

  return {
    conversations: conversations || [],
    loadingConversations,
  };
};

export const useConversationMessages = (participantId: string | null) => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { playNotificationSound } = useChatNotificationSound();
  const [isTyping, setIsTyping] = useState(false);
  const initialLoadDoneRef = useRef(false);

  // Récupérer les messages d'une conversation
  const { data: messages, isLoading } = useQuery({
    queryKey: ['conversation-messages', participantId, user?.id],
    queryFn: async () => {
      if (!user || !participantId) return [];

      // Récupérer le creator_id si l'utilisateur est un créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const isCreator = !!creatorData;
      const creatorId = creatorData?.id;

      let query;
      if (isCreator && creatorId) {
        // Je suis créateur, participantId est un subscriber_id
        query = supabase
          .from('private_messages')
          .select('*')
          .eq('creator_id', creatorId)
          .eq('subscriber_id', participantId);
      } else {
        // Je suis subscriber, participantId est un creator_id
        query = supabase
          .from('private_messages')
          .select('*')
          .eq('subscriber_id', user.id)
          .eq('creator_id', participantId);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      // Mapper les messages avec is_from_me
      return (data || []).map(msg => ({
        ...msg,
        is_from_me: isCreator 
          ? msg.creator_id === creatorId 
          : msg.subscriber_id === user.id && msg.message_type === 'text',
      })) as Message[];
    },
    enabled: !!user && !!participantId,
  });

  // Envoyer un message texte
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !participantId || !content.trim()) {
        throw new Error('Paramètres invalides');
      }

      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const isCreator = !!creatorData;
      const creatorId = creatorData?.id;

      let messageData;
      if (isCreator && creatorId) {
        messageData = {
          creator_id: creatorId,
          subscriber_id: participantId,
          message_type: 'text' as const,
          content: content.trim(),
          price: 0,
          is_paid: true,
        };
      } else {
        messageData = {
          creator_id: participantId,
          subscriber_id: user.id,
          message_type: 'text' as const,
          content: content.trim(),
          price: 0,
          is_paid: true,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', participantId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Envoyer un média payant
  const sendPaidMedia = useMutation({
    mutationFn: async ({ 
      mediaUrl, 
      thumbnailUrl, 
      price, 
      messageType 
    }: { 
      mediaUrl: string; 
      thumbnailUrl?: string; 
      price: number; 
      messageType: 'image' | 'video';
    }) => {
      if (!user || !participantId) throw new Error('Non authentifié');

      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!creatorData) throw new Error('Seuls les créateurs peuvent envoyer du contenu payant');

      const messageData = {
        creator_id: creatorData.id,
        subscriber_id: participantId,
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
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', participantId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Contenu envoyé');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Payer pour débloquer un contenu
  const unlockContent = useMutation({
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
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!user || !participantId) return;

    const channel = supabase
      .channel(`conversation-${participantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Vérifier si le message appartient à cette conversation
          const isForThisConversation = 
            newMessage.subscriber_id === participantId || 
            newMessage.creator_id === participantId;
          
          if (isForThisConversation) {
            queryClient.invalidateQueries({ queryKey: ['conversation-messages', participantId] });
            
            // Jouer le son si ce n'est pas notre message
            if (initialLoadDoneRef.current) {
              const isFromMe = newMessage.subscriber_id === user.id;
              if (!isFromMe) {
                playNotificationSound();
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
        },
        () => {
          // Rafraîchir pour les updates (ex: is_paid = true)
          queryClient.invalidateQueries({ queryKey: ['conversation-messages', participantId] });
        }
      )
      .subscribe();

    initialLoadDoneRef.current = true;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, participantId, queryClient, playNotificationSound]);

  return {
    messages: messages || [],
    isLoading,
    isTyping,
    sendMessage,
    sendPaidMedia,
    unlockContent,
  };
};