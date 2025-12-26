import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ModernPrivateChat from './ModernPrivateChat';
import { toast } from 'sonner';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Conversation {
  participant_id: string;
  participant_type: 'creator' | 'subscriber';
  creator_id: string;
  subscriber_id: string;
  subscriber_name: string;
  subscriber_avatar: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

const CreatorMessages: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { markAsRead, refetch: refetchUnread } = useUnreadMessages();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  // Récupérer l'ID créateur
  const { data: creatorData } = useQuery({
    queryKey: ['creator-id', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Récupérer les conversations avec comptage des messages non lus
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['creator-conversations', creatorData?.id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const creatorId = creatorData?.id;

      // Récupérer les messages où l'utilisateur est impliqué
      let query = supabase
        .from('private_messages')
        .select(`
          creator_id,
          subscriber_id,
          sender_id,
          content,
          created_at,
          message_type,
          read_at
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      // Filtrer par créateur OU subscriber
      if (creatorId) {
        query = query.or(`creator_id.eq.${creatorId},subscriber_id.eq.${user.id}`);
      } else {
        query = query.eq('subscriber_id', user.id);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      // Grouper par participant (l'autre personne dans la conversation)
      const conversationMap = new Map<string, any>();
      for (const msg of messages || []) {
        // Déterminer qui est l'autre participant
        let participantId: string;
        let participantType: 'creator' | 'subscriber';
        
        if (creatorId && msg.creator_id === creatorId) {
          // Je suis le créateur, l'autre est subscriber
          participantId = msg.subscriber_id;
          participantType = 'subscriber';
        } else {
          // Je suis subscriber, l'autre est créateur
          participantId = msg.creator_id;
          participantType = 'creator';
        }
        
        // Ignorer les conversations avec soi-même
        if (participantId === user.id || participantId === creatorId) continue;
        
        if (!conversationMap.has(participantId)) {
          conversationMap.set(participantId, {
            participant_id: participantId,
            participant_type: participantType,
            creator_id: msg.creator_id,
            subscriber_id: msg.subscriber_id,
            last_message: msg.message_type === 'text' ? msg.content : `📷 ${msg.message_type === 'image' ? 'Photo' : 'Vidéo'}`,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
        
        // Compter les messages non lus (envoyés par l'autre, pas encore lus)
        if (msg.sender_id !== user.id && !msg.read_at) {
          const conv = conversationMap.get(participantId);
          conv.unread_count++;
        }
      }

      // Récupérer les infos des participants
      const participantIds = Array.from(conversationMap.keys());
      if (participantIds.length === 0) return [];

      // Séparer les IDs par type
      const creatorParticipants = Array.from(conversationMap.entries())
        .filter(([_, v]) => v.participant_type === 'creator')
        .map(([id, _]) => id);
      const subscriberParticipants = Array.from(conversationMap.entries())
        .filter(([_, v]) => v.participant_type === 'subscriber')
        .map(([id, _]) => id);

      const participantsData = new Map<string, any>();

      // Fetch les créateurs participants
      if (creatorParticipants.length > 0) {
        const { data: creators } = await supabase
          .from('creators')
          .select('id, stage_name, user_id')
          .in('id', creatorParticipants);

        for (const c of creators || []) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, display_name, username')
            .eq('user_id', c.user_id)
            .maybeSingle();
          
          participantsData.set(c.id, {
            name: c.stage_name || profile?.display_name || 'Créateur',
            avatar: profile?.avatar_url,
          });
        }
      }

      // Fetch les subscribers participants
      if (subscriberParticipants.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, username')
          .in('user_id', subscriberParticipants);

        for (const p of profiles || []) {
          participantsData.set(p.user_id, {
            name: p.display_name || p.username || 'Utilisateur',
            avatar: p.avatar_url,
          });
        }
      }

      return Array.from(conversationMap.entries()).map(([participantId, conv]) => {
        const participant = participantsData.get(participantId);
        return {
          participant_id: participantId,
          participant_type: conv.participant_type,
          creator_id: conv.creator_id,
          subscriber_id: conv.subscriber_id,
          subscriber_id_for_delete: conv.subscriber_id,
          creator_id_for_delete: conv.creator_id,
          subscriber_name: participant?.name || 'Utilisateur',
          subscriber_avatar: participant?.avatar,
          last_message: conv.last_message,
          last_message_at: conv.last_message_at,
          unread_count: conv.unread_count,
        };
      });
    },
    enabled: !!user,
  });

  // Marquer comme lu quand on ouvre une conversation
  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    
    // Marquer les messages de cette conversation comme lus
    if (conv.unread_count > 0 && conv.participant_type === 'subscriber') {
      // Utiliser subscriber_id de la conversation, pas participant_id
      await markAsRead.mutateAsync(conv.subscriber_id);
      refetch();
      refetchUnread();
    }
  };

  const handleDeleteConversation = async (conv: Conversation) => {
    if (!user) return;
    
    setDeletingId(conv.participant_id);
    try {
      // Supprimer tous les messages de cette conversation
      const { error } = await supabase
        .from('private_messages')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          content: null,
          media_url: null,
          media_thumbnail: null
        })
        .eq('creator_id', conv.creator_id)
        .eq('subscriber_id', conv.subscriber_id);

      if (error) throw error;

      toast.success('Conversation supprimée');
      queryClient.invalidateQueries({ queryKey: ['creator-conversations'] });
      refetch();
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && !conversations) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (selectedConversation) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedConversation(null)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux conversations
        </Button>
        <ModernPrivateChat
          creatorId={selectedConversation.creator_id}
          creatorName={selectedConversation.subscriber_name}
          creatorAvatar={selectedConversation.subscriber_avatar || undefined}
          subscriberId={selectedConversation.participant_type === 'subscriber' ? selectedConversation.participant_id : selectedConversation.subscriber_id}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messages privés
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement des conversations...
          </div>
        ) : conversations && conversations.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.participant_id}
                  onClick={() => handleSelectConversation(conv)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all border border-border/50 group"
                >
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={conv.subscriber_avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {conv.subscriber_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground">{conv.subscriber_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.last_message_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {conv.unread_count > 0 && (
                      <Badge variant="default" className="shrink-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                    
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConversationToDelete(conv);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune conversation</p>
            <p className="text-sm">Les messages de vos abonnés apparaîtront ici</p>
          </div>
        )}
        
        <AlertDialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Tous les messages avec {conversationToDelete?.subscriber_name} seront supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConversationToDelete(null)}>Annuler</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={!!deletingId}
                onClick={async () => {
                  if (conversationToDelete) {
                    await handleDeleteConversation(conversationToDelete);
                    setConversationToDelete(null);
                  }
                }}
              >
                {deletingId ? 'Suppression...' : 'Supprimer'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default CreatorMessages;
