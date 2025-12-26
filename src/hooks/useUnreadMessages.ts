import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export const useUnreadMessages = () => {
  const { user } = useAuth();

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

      // Compter les messages non lus (envoyés par des subscribers, pas encore vus)
      // On compte les messages où sender_id != user.id (pas envoyés par moi)
      // et où status != 'read' ou created_at récent
      const { count, error } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', creator.id)
        .neq('sender_id', user.id)
        .is('is_deleted', false);

      if (error) {
        console.error('Error counting unread messages:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 60000, // Refresh every minute
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetch]);

  return { unreadCount, refetch };
};
