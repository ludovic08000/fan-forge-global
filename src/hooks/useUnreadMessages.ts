import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Récupérer l'ID créateur de l'utilisateur
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!creator) return 0;

      // Compter les messages non lus envoyés par des subscribers (pas par le créateur)
      const { count, error } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', creator.id)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .eq('is_deleted', false);

      if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Marquer les messages d'une conversation comme lus
  const markAsRead = useMutation({
    mutationFn: async (subscriberId: string) => {
      if (!user) throw new Error('Non authentifié');

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!creator) return;

      // Marquer tous les messages non lus de ce subscriber comme lus
      const { error } = await supabase
        .from('private_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('creator_id', creator.id)
        .eq('subscriber_id', subscriberId)
        .neq('sender_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
        () => {
          refetch();
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
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  return { unreadCount, refetch, markAsRead };
};
