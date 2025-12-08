/**
 * Hook pour gérer le chat en direct des live streams avec pagination
 * Permet d'envoyer et recevoir des messages en temps réel
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ContentOffer {
  content_id: string;
  title: string;
  price: number;
  thumbnail_url?: string;
}

export interface ChatMessage {
  id: string;
  live_stream_id: string;
  user_id: string;
  username: string;
  message: string;
  message_type: 'text' | 'offer';
  content_offer?: ContentOffer | null;
  created_at: string;
}

const MESSAGES_PER_PAGE = 50;
const MAX_MESSAGES_IN_MEMORY = 200;

/**
 * Hook personnalisé pour gérer le chat en direct avec pagination
 */
export const useLiveChat = (streamId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null);

  /**
   * Charger les messages avec pagination
   */
  const loadMessages = useCallback(async (loadMore = false, fromDate?: string | null) => {
    // Ne pas charger si pas de streamId
    if (!streamId) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('live_stream_messages')
        .select('*')
        .eq('live_stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      // Si on charge plus de messages, partir du plus ancien message actuel
      if (loadMore && fromDate) {
        query = query.lt('created_at', fromDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Inverser l'ordre pour afficher du plus ancien au plus récent
        const newMessages: ChatMessage[] = data.reverse().map(msg => ({
          ...msg,
          message_type: (msg.message_type || 'text') as 'text' | 'offer',
          content_offer: msg.content_offer as unknown as ContentOffer | null,
        }));
        
        if (loadMore) {
          // Ajouter les nouveaux messages au début
          setMessages((prev) => {
            const combined = [...newMessages, ...prev];
            // Limiter le nombre de messages en mémoire
            return combined.slice(-MAX_MESSAGES_IN_MEMORY);
          });
        } else {
          setMessages(newMessages);
        }

        setOldestMessageDate(newMessages[0].created_at);
        setHasMore(data.length === MESSAGES_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  /**
   * Envoyer un message texte
   */
  const sendMessage = async (message: string) => {
    if (!user || !message.trim()) return;

    try {
      // Récupérer le profil pour le username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('user_id', user.id)
        .single();

      const username = profile?.username || profile?.display_name || user.email || 'Anonyme';

      const { error } = await supabase
        .from('live_stream_messages')
        .insert({
          live_stream_id: streamId,
          user_id: user.id,
          username,
          message: message.trim(),
          message_type: 'text',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  /**
   * Envoyer une offre de contenu (créateurs uniquement)
   */
  const sendContentOffer = async (content: ContentOffer) => {
    if (!user) return;

    try {
      // Récupérer le profil pour le username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('user_id', user.id)
        .single();

      const username = profile?.username || profile?.display_name || user.email || 'Créateur';

      const { error } = await supabase
        .from('live_stream_messages')
        .insert([{
          live_stream_id: streamId,
          user_id: user.id,
          username,
          message: `🎁 Offre spéciale: ${content.title}`,
          message_type: 'offer',
          content_offer: JSON.parse(JSON.stringify(content)),
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Erreur envoi offre:', error);
    }
  };

  /**
   * Écouter les nouveaux messages en temps réel
   */
  useEffect(() => {
    // Ne pas s'abonner si pas de streamId
    if (!streamId) return;
    
    loadMessages();

    const channel = supabase
      .channel(`live_chat_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_stream_messages',
          filter: `live_stream_id=eq.${streamId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const updated = [...prev, payload.new as ChatMessage];
            // Garder seulement les derniers messages pour éviter surcharge mémoire
            return updated.slice(-MAX_MESSAGES_IN_MEMORY);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, loadMessages]);

  return {
    messages,
    loading,
    hasMore,
    sendMessage,
    sendContentOffer,
    loadMore: () => loadMessages(true, oldestMessageDate),
  };
};
