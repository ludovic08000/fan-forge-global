import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useChatNotificationSound } from './useChatNotificationSound';

export const useMessageNotifications = () => {
  const { user, userRole } = useAuth();
  const { playNotificationSound } = useChatNotificationSound();
  const notificationPermission = useRef<NotificationPermission>('default');
  const creatorIdRef = useRef<string | null>(null);

  // Demander la permission pour les notifications
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne supporte pas les notifications');
      return false;
    }

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

  // Afficher une notification native (cross-browser)
  const showNotification = (title: string, body: string, data?: { url?: string }) => {
    if (notificationPermission.current !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        tag: `notification-${Date.now()}`,
        silent: false, // Laisser le navigateur jouer le son système aussi
      });

      notification.onclick = () => {
        window.focus();
        if (data?.url) {
          window.location.href = data.url;
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      // Safari peut rejeter new Notification, utiliser le toast comme fallback
      console.warn('Notification API error, using toast fallback:', error);
    }
  };

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

    // Channel 1: Nouveaux messages privés
    const messagesChannel = supabase
      .channel('private-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
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
            if (newMessage.message_type === 'image') {
              messagePreview = '📷 Image';
            } else if (newMessage.message_type === 'video') {
              messagePreview = '🎥 Vidéo';
            } else if (newMessage.price > 0 && !newMessage.is_paid) {
              messagePreview = '💎 Contenu payant';
            }

            playNotificationSound();

            showNotification(
              `Nouveau message de ${senderName}`,
              messagePreview.substring(0, 100),
              { url: chatUrl }
            );

            toast.info(`Nouveau message de ${senderName}`, {
              description: messagePreview.substring(0, 50),
              action: {
                label: 'Voir',
                onClick: () => {
                  window.location.href = chatUrl;
                },
              },
            });
          }
        }
      )
      .subscribe();

    // Channel 2: Notifications de début de live
    const liveChannel = supabase
      .channel('live-start-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
        },
        async (payload) => {
          const updatedLive = payload.new as any;
          const oldLive = payload.old as any;

          // Détecter uniquement le passage à "live"
          if (updatedLive.status !== 'live' || oldLive?.status === 'live') return;

          // Ne pas notifier le créateur lui-même
          const { data: creator } = await supabase
            .from('creators')
            .select('user_id, stage_name')
            .eq('id', updatedLive.creator_id)
            .single();

          if (!creator || creator.user_id === user.id) return;

          // Vérifier si l'utilisateur est abonné à ce créateur
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
          const currentPath = window.location.pathname;

          if (!currentPath.includes(liveUrl)) {
            playNotificationSound();

            showNotification(
              `${creatorName} est en live ! 🔴`,
              updatedLive.title || 'Un live vient de commencer',
              { url: liveUrl }
            );

            toast.info(`🔴 ${creatorName} est en live !`, {
              description: updatedLive.title || 'Cliquez pour regarder',
              duration: 8000,
              action: {
                label: 'Regarder',
                onClick: () => {
                  window.location.href = liveUrl;
                },
              },
            });
          }
        }
      )
      .subscribe();

    // Channel 3: Notifications générales (tips, abonnements, etc.)
    const notifChannel = supabase
      .channel('general-notifications-sound')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as any;
          
          // Jouer le son pour les notifications importantes
          const importantTypes = ['tip_received', 'new_subscriber', 'sale', 'payment_success', 'auction_bid'];
          if (importantTypes.includes(notif.type)) {
            playNotificationSound();

            showNotification(
              notif.title || 'TheForge',
              notif.message || 'Nouvelle notification',
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(liveChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [user, userRole, playNotificationSound]);

  return { requestPermission };
};
