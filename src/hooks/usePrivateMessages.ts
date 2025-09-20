import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const usePrivateMessages = (creatorId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer les messages privés
  const { data: messages, isLoading } = useQuery({
    queryKey: ['private-messages', creatorId, user?.id],
    queryFn: async () => {
      if (!user || !creatorId) return [];
      
      const { data, error } = await supabase
        .from('private_messages')
        .select(`
          *,
          creator:creators!creator_id(stage_name, user_id),
          subscriber:profiles!subscriber_id(display_name, avatar_url)
        `)
        .or(`and(creator_id.eq.${creatorId},subscriber_id.eq.${user.id}),and(creator_id.eq.${user.id},subscriber_id.eq.${creatorId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!creatorId,
  });

  // Envoyer un message texte
  const sendMessage = useMutation({
    mutationFn: async ({ content, creatorId: targetCreatorId }: { content: string; creatorId: string }) => {
      if (!user) throw new Error('Non authentifié');

      // Vérifier si l'utilisateur est un créateur ou un abonné
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let messageData;
      if (creator) {
        // L'utilisateur est un créateur, il envoie à un abonné
        messageData = {
          creator_id: creator.id,
          subscriber_id: targetCreatorId, // Dans ce cas, targetCreatorId est en fait l'ID du subscriber
          message_type: 'text' as const,
          content,
        };
      } else {
        // L'utilisateur est un abonné, il envoie au créateur
        messageData = {
          creator_id: targetCreatorId,
          subscriber_id: user.id,
          message_type: 'text' as const,
          content,
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
      queryClient.invalidateQueries({ queryKey: ['private-messages'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'envoi: ${error.message}`);
    },
  });

  // Envoyer du contenu média payant
  const sendPaidContent = useMutation({
    mutationFn: async ({ 
      mediaUrl, 
      thumbnailUrl, 
      price, 
      creatorId: targetCreatorId,
      messageType 
    }: { 
      mediaUrl: string; 
      thumbnailUrl?: string; 
      price: number; 
      creatorId: string;
      messageType: 'video' | 'image';
    }) => {
      if (!user) throw new Error('Non authentifié');

      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creator) throw new Error('Seuls les créateurs peuvent envoyer du contenu payant');

      const messageData = {
        creator_id: creator.id,
        subscriber_id: targetCreatorId, // ID du subscriber
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
      queryClient.invalidateQueries({ queryKey: ['private-messages'] });
      toast.success('Contenu envoyé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'envoi: ${error.message}`);
    },
  });

  // Payer pour du contenu privé
  const payForContent = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('pay-private-content', {
        body: { messageId },
      });

      if (error) throw error;
      
      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.open(data.url, '_blank');
      }
      
      return data;
    },
    onError: (error) => {
      toast.error(`Erreur lors du paiement: ${error.message}`);
    },
  });

  return {
    messages,
    isLoading,
    sendMessage,
    sendPaidContent,
    payForContent,
  };
};