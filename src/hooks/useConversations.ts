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

  // Récupérer toutes les conversations avec requêtes optimisées
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

      // Récupérer uniquement le dernier message par conversation avec une requête optimisée
      let query = supabase
        .from('private_messages')
        .select('id, creator_id, subscriber_id, content, message_type, created_at')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100); // Limiter pour la performance

      if (isCreator && creatorId) {
        query = query.eq('creator_id', creatorId);
      } else {
        query = query.eq('subscriber_id', user.id);
      }

      const { data: messages, error } = await query;
      if (error) throw error;

      // Grouper par participant (garder seulement le dernier message)
      const conversationMap = new Map<string, any>();
      const participantIds: string[] = [];

      for (const msg of messages || []) {
        const participantId = isCreator ? msg.subscriber_id : msg.creator_id;
        
        if (!conversationMap.has(participantId)) {
          participantIds.push(participantId);
          conversationMap.set(participantId, {
            participant_id: participantId,
            last_message: msg.content || (msg.message_type === 'image' ? '📷 Photo' : '🎬 Vidéo'),
            last_message_type: msg.message_type,
            last_message_time: msg.created_at,
            unread_count: 0,
          });
        }
      }

      if (participantIds.length === 0) return [];

      // Requête batch pour tous les participants en une seule fois
      let participantsData: Map<string, any> = new Map();

      if (isCreator) {
        // Les participants sont des subscribers - fetch tous les profiles en une requête
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', participantIds);

        profiles?.forEach(p => {
          participantsData.set(p.user_id, {
            name: p.display_name || p.username || 'Utilisateur',
            avatar: p.avatar_url,
            is_creator: false,
          });
        });
      } else {
        // Les participants sont des créateurs - fetch avec join en une requête
        const { data: creators } = await supabase
          .from('creators')
          .select('id, stage_name, user_id, profiles!creators_user_id_fkey(avatar_url)')
          .in('id', participantIds);

        creators?.forEach(c => {
          const profile = c.profiles as any;
          participantsData.set(c.id, {
            name: c.stage_name || 'Créateur',
            stage_name: c.stage_name,
            avatar: profile?.avatar_url,
            is_creator: true,
          });
        });
      }

      // Construire le tableau final
      const conversationsData: Conversation[] = participantIds
        .map(participantId => {
          const convData = conversationMap.get(participantId);
          const participant = participantsData.get(participantId);
          
          if (!participant) return null;

          return {
            id: participantId,
            participant_id: participantId,
            participant_name: participant.name,
            participant_stage_name: participant.stage_name,
            participant_avatar: participant.avatar,
            is_creator: participant.is_creator,
            ...convData,
          };
        })
        .filter(Boolean) as Conversation[];

      return conversationsData;
    },
    enabled: !!user,
    staleTime: 30000, // Cache 30 secondes
  });

  // Supprimer une conversation (soft delete tous les messages)
  const deleteConversation = useMutation({
    mutationFn: async (participantId: string) => {
      if (!user) throw new Error('Non authentifié');

      // Récupérer le creator_id si l'utilisateur est un créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const isCreator = !!creatorData;
      const creatorId = creatorData?.id;

      let deleteQuery;
      if (isCreator && creatorId) {
        // Je suis créateur, supprimer les messages avec ce subscriber
        deleteQuery = supabase
          .from('private_messages')
          .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString(),
            content: null,
            media_url: null,
            media_thumbnail: null
          })
          .eq('creator_id', creatorId)
          .eq('subscriber_id', participantId);
      } else {
        // Je suis subscriber, supprimer les messages avec ce créateur
        deleteQuery = supabase
          .from('private_messages')
          .update({ 
            is_deleted: true, 
            deleted_at: new Date().toISOString(),
            content: null,
            media_url: null,
            media_thumbnail: null
          })
          .eq('subscriber_id', user.id)
          .eq('creator_id', participantId);
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      return participantId;
    },
    onSuccess: (participantId) => {
      // Mettre à jour le cache localement
      queryClient.setQueryData(['conversations', user?.id], (old: Conversation[] | undefined) => {
        if (!old) return [];
        return old.filter(c => c.participant_id !== participantId);
      });
      toast.success('Conversation supprimée');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
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
    deleteConversation,
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