/**
 * Hook pour gérer le chat en direct des live streams
 * Permet d'envoyer et recevoir des messages en temps réel
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  live_stream_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

/**
 * Hook personnalisé pour gérer le chat en direct
 */
export const useLiveChat = (streamId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Charger les messages existants
   */
  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_stream_messages')
        .select('*')
        .eq('live_stream_id', streamId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envoyer un message
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
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  /**
   * Écouter les nouveaux messages en temps réel
   */
  useEffect(() => {
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
          console.log('Nouveau message:', payload);
          setMessages((current) => [...current, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return {
    messages,
    loading,
    sendMessage,
  };
};
