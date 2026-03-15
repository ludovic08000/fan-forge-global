import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useCallback } from 'react';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const creatorIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: unreadCount = 0, refetch } = useQuery({
    queryKey: ['unread-messages-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!creator) return 0;
      creatorIdRef.current = creator.id;

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
    staleTime: 60_000,
    refetchInterval: 120_000, // Reduced from 60s to 120s
  });

  // Debounced refetch to avoid hammering DB on rapid message bursts
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => refetch(), 2000);
  }, [refetch]);

  const markAsRead = useMutation({
    mutationFn: async (subscriberId: string) => {
      if (!user) throw new Error('Non authentifié');

      const creatorId = creatorIdRef.current;
      if (!creatorId) {
        const { data: creator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!creator) return;
        creatorIdRef.current = creator.id;
      }

      const { error } = await supabase
        .from('private_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('creator_id', creatorIdRef.current!)
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

  // Listen for new messages with filtered channel
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-msg-count')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'private_messages' },
        () => debouncedRefetch()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, debouncedRefetch]);

  return { unreadCount, refetch, markAsRead };
};
