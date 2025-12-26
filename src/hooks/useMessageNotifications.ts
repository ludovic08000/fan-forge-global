import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useMessageNotifications = () => {
  const { user, userRole } = useAuth();
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

  // Afficher une notification
  const showNotification = (title: string, body: string, data?: { url?: string }) => {
    if (notificationPermission.current !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-icon-192.png',
        badge: '/pwa-icon-192.png',
        tag: 'new-message',
      });

      notification.onclick = () => {
        window.focus();
        if (data?.url) {
          window.location.href = data.url;
        }
        notification.close();
      };

      // Fermer automatiquement après 5 secondes
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Erreur lors de l\'affichage de la notification:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Demander la permission au chargement
    requestPermission();

    // Récupérer l'ID du créateur si l'utilisateur est un créateur
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

    // S'abonner aux nouveaux messages en temps réel
    const channel = supabase
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

          // Vérifier si le message nous concerne
          let isForMe = false;
          let senderName = 'Quelqu\'un';
          let chatUrl = '';

          if (userRole === 'creator' && creatorIdRef.current) {
            // Si je suis créateur et le message est pour moi
            if (newMessage.creator_id === creatorIdRef.current && newMessage.subscriber_id !== user.id) {
              isForMe = true;
              chatUrl = `/chat/${newMessage.subscriber_id}`;
              
              // Récupérer le nom de l'abonné
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, username')
                .eq('user_id', newMessage.subscriber_id)
                .single();
              
              senderName = profile?.display_name || profile?.username || 'Un abonné';
            }
          } else {
            // Si je suis abonné et le message vient d'un créateur
            if (newMessage.subscriber_id === user.id) {
              isForMe = true;
              chatUrl = `/chat/${newMessage.creator_id}`;
              
              // Récupérer le nom du créateur
              const { data: creator } = await supabase
                .from('creators')
                .select('stage_name')
                .eq('id', newMessage.creator_id)
                .single();
              
              senderName = creator?.stage_name || 'Un créateur';
            }
          }

          // Ne pas notifier si je suis sur la page de chat de cette conversation
          const currentPath = window.location.pathname;
          if (isForMe && !currentPath.includes(chatUrl)) {
            // Déterminer le contenu du message
            let messagePreview = newMessage.content || '';
            if (newMessage.message_type === 'image') {
              messagePreview = '📷 Image';
            } else if (newMessage.message_type === 'video') {
              messagePreview = '🎥 Vidéo';
            } else if (newMessage.price > 0 && !newMessage.is_paid) {
              messagePreview = '💎 Contenu payant';
            }

            // Afficher la notification
            showNotification(
              `Nouveau message de ${senderName}`,
              messagePreview.substring(0, 100),
              { url: chatUrl }
            );

            // Toast pour les utilisateurs sur le site
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  return { requestPermission };
};
