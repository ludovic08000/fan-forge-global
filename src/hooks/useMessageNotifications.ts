import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useChatNotificationSound } from './useChatNotificationSound';

export const useMessageNotifications = () => {
  const { user, userRole } = useAuth();
  const { playNotificationSound } = useChatNotificationSound();
  const notificationPermission = useRef<NotificationPermission>('default');
  const creatorIdRef = useRef<string | null>(null);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      notificationPermission.current = 'granted';
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      notificationPermission.current = permission;
      return permission === 'granted';
    }
    return false;
  };

  const showNotification = useCallback((title: string, body: string, data?: { url?: string }) => {
    if (notificationPermission.current !== 'granted') return;
    try {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        tag: `notification-${Date.now()}`,
        silent: false,
      });
      notification.onclick = () => {
        window.focus();
        if (data?.url) window.location.href = data.url;
        notification.close();
      };
      setTimeout(() => notification.close(), 5000);
    } catch {
      // Safari fallback — toast will handle it
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    requestPermission();

    const getCreatorId = async () => {
      if (userRole === 'creator') {
        const { data } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single();
        creatorIdRef.current = data?.id || null;
      }
    };
    getCreatorId();

    // CONSOLIDATED: Single channel for all notification-worthy events
    const notifChannel = supabase
      .channel('app-notifications')
      // Private messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'private_messages' },
        async (payload) => {
          const newMessage = payload.new as any;
          let isForMe = false;
          let senderName = 'Quelqu\'un';
          let chatUrl = '';

          if (userRole === 'creator' && creatorIdRef.current) {
            if (newMessage.creator_id === creatorIdRef.current && newMessage.subscriber_id !== user.id) {
              isForMe = true;
              chatUrl = `/chat/${newMessage.subscriber_id}`;
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, username')
                .eq('user_id', newMessage.subscriber_id)
                .single();
              senderName = profile?.display_name || profile?.username || 'Un abonné';
            }
          } else {
            if (newMessage.subscriber_id === user.id) {
              isForMe = true;
              chatUrl = `/chat/${newMessage.creator_id}`;
              const { data: creator } = await supabase
                .from('creators')
                .select('stage_name')
                .eq('id', newMessage.creator_id)
                .single();
              senderName = creator?.stage_name || 'Un créateur';
            }
          }

          const currentPath = window.location.pathname;
          if (isForMe && !currentPath.includes(chatUrl)) {
            let messagePreview = newMessage.content || '';
            if (newMessage.message_type === 'image') messagePreview = '📷 Image';
            else if (newMessage.message_type === 'video') messagePreview = '🎥 Vidéo';
            else if (newMessage.price > 0 && !newMessage.is_paid) messagePreview = '💎 Contenu payant';

            playNotificationSound();
            showNotification(`Nouveau message de ${senderName}`, messagePreview.substring(0, 100), { url: chatUrl });
            toast.info(`Nouveau message de ${senderName}`, {
              description: messagePreview.substring(0, 50),
              action: { label: 'Voir', onClick: () => { window.location.href = chatUrl; } },
            });
          }
        }
      )
      // Live stream status changes
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams' },
        async (payload) => {
          const updatedLive = payload.new as any;
          const oldLive = payload.old as any;
          if (updatedLive.status !== 'live' || oldLive?.status === 'live') return;

          const { data: creator } = await supabase
            .from('creators')
            .select('user_id, stage_name')
            .eq('id', updatedLive.creator_id)
            .single();
          if (!creator || creator.user_id === user.id) return;

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', updatedLive.creator_id)
            .eq('status', 'active')
            .maybeSingle();
          if (!sub) return;

          const creatorName = creator.stage_name || 'Un créateur';
          const liveUrl = `/watch/${updatedLive.id}`;
          if (!window.location.pathname.includes(liveUrl)) {
            playNotificationSound();
            showNotification(`${creatorName} est en live ! 🔴`, updatedLive.title || 'Un live vient de commencer', { url: liveUrl });
            toast.info(`🔴 ${creatorName} est en live !`, {
              description: updatedLive.title || 'Cliquez pour regarder',
              duration: 8000,
              action: { label: 'Regarder', onClick: () => { window.location.href = liveUrl; } },
            });
          }
        }
      )
      // General notifications (tips, subs, sales)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as any;
          const importantTypes = ['tip_received', 'new_subscriber', 'sale', 'payment_success', 'auction_bid'];
          if (importantTypes.includes(notif.type)) {
            playNotificationSound();
            showNotification(notif.title || 'TheForge', notif.message || 'Nouvelle notification');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user, userRole, playNotificationSound, showNotification]);

  return { requestPermission };
};
