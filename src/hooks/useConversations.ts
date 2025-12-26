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

      // Récupérer les messages où l'utilisateur est impliqué (comme creator ou subscriber)
      let filterParts: string[] = [];
      
      // Messages où je suis subscriber
      filterParts.push(`subscriber_id.eq.${user.id}`);
      
      // Messages où je suis créateur
      if (creatorId) {
        filterParts.push(`creator_id.eq.${creatorId}`);
        filterParts.push(`subscriber_id.eq.${creatorId}`);
      }

      const { data: messages, error } = await supabase
        .from('private_messages')
        .select('id, creator_id, subscriber_id, content, message_type, created_at')
        .eq('is_deleted', false)
        .or(filterParts.join(','))
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Grouper par participant (garder seulement le dernier message)
      const conversationMap = new Map<string, any>();
      const participantIds: string[] = [];
      const participantTypes = new Map<string, 'creator' | 'subscriber'>();

      for (const msg of messages || []) {
        // Déterminer qui est l'autre participant
        let participantId: string;
        let participantType: 'creator' | 'subscriber';
        
        // Si je suis le creator_id ou subscriber_id
        const iAmCreator = creatorId && (msg.creator_id === creatorId);
        const iAmSubscriber = msg.subscriber_id === user.id || (creatorId && msg.subscriber_id === creatorId);
        
        if (iAmCreator && msg.subscriber_id !== creatorId && msg.subscriber_id !== user.id) {
          // Je suis créateur, l'autre est subscriber
          participantId = msg.subscriber_id;
          participantType = 'subscriber';
        } else if (iAmSubscriber || msg.subscriber_id === user.id) {
          // L'autre est créateur
          participantId = msg.creator_id;
          participantType = 'creator';
        } else {
          continue; // Message ne nous concerne pas
        }
        
        // Ignorer les conversations avec soi-même
        if (participantId === user.id || participantId === creatorId) continue;
        
        if (!conversationMap.has(participantId)) {
          participantIds.push(participantId);
          participantTypes.set(participantId, participantType);
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

      // Séparer les IDs par type
      const creatorParticipantIds = participantIds.filter(id => participantTypes.get(id) === 'creator');
      const subscriberParticipantIds = participantIds.filter(id => participantTypes.get(id) === 'subscriber');

      // Fetch les créateurs participants
      if (creatorParticipantIds.length > 0) {
        const { data: creators } = await supabase
          .from('creators')
          .select('id, stage_name, user_id, profiles!creators_user_id_fkey(avatar_url)')
          .in('id', creatorParticipantIds);

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

      // Fetch les subscribers participants
      if (subscriberParticipantIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', subscriberParticipantIds);

        profiles?.forEach(p => {
          participantsData.set(p.user_id, {
            name: p.display_name || p.username || 'Utilisateur',
            avatar: p.avatar_url,
            is_creator: false,
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

      const creatorId = creatorData?.id;

      // Construire le filtre OR pour couvrir tous les cas
      let filterParts: string[] = [];
      
      // Cas où je suis subscriber
      filterParts.push(`and(subscriber_id.eq.${user.id},creator_id.eq.${participantId})`);
      
      // Cas où je suis créateur
      if (creatorId) {
        filterParts.push(`and(creator_id.eq.${creatorId},subscriber_id.eq.${participantId})`);
        filterParts.push(`and(subscriber_id.eq.${creatorId},creator_id.eq.${participantId})`);
      }

      const { error } = await supabase
        .from('private_messages')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          content: null,
          media_url: null,
          media_thumbnail: null
        })
        .or(filterParts.join(','));

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

      const creatorId = creatorData?.id;

      // Construire le filtre OR pour couvrir tous les cas
      let filterParts: string[] = [];
      
      // Cas où je suis subscriber et l'autre est créateur
      filterParts.push(`and(subscriber_id.eq.${user.id},creator_id.eq.${participantId})`);
      
      // Cas où je suis créateur
      if (creatorId) {
        // L'autre est subscriber
        filterParts.push(`and(creator_id.eq.${creatorId},subscriber_id.eq.${participantId})`);
        // L'autre est aussi créateur (je suis subscriber dans son contexte)
        filterParts.push(`and(subscriber_id.eq.${creatorId},creator_id.eq.${participantId})`);
      }

      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .or(filterParts.join(','))
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mapper les messages avec is_from_me
      return (data || []).map(msg => {
        // Déterminer si le message vient de moi
        let isFromMe = false;
        if (creatorId) {
          // Je suis créateur - le message vient de moi si creator_id = mon creatorId
          isFromMe = msg.creator_id === creatorId;
        } else {
          // Je suis subscriber - le message vient de moi si subscriber_id = mon user.id ET message_type = text
          isFromMe = msg.subscriber_id === user.id;
        }
        
        return {
          ...msg,
          is_from_me: isFromMe,
        };
      }) as Message[];
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