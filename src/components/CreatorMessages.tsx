import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '@/hooks/useConversations';
import ModernPrivateChat from './ModernPrivateChat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Conversation {
  subscriber_id: string;
  subscriber_name: string;
  subscriber_avatar: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

const CreatorMessages: React.FC = () => {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { deleteConversation } = useConversations();

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

  // Récupérer les conversations
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['creator-conversations', creatorData?.id],
    queryFn: async () => {
      if (!creatorData?.id) return [];

      // Récupérer les messages groupés par subscriber
      const { data: messages, error } = await supabase
        .from('private_messages')
        .select(`
          subscriber_id,
          content,
          created_at,
          message_type
        `)
        .eq('creator_id', creatorData.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Grouper par subscriber
      const conversationMap = new Map<string, any>();
      for (const msg of messages || []) {
        if (!conversationMap.has(msg.subscriber_id)) {
          conversationMap.set(msg.subscriber_id, {
            subscriber_id: msg.subscriber_id,
            last_message: msg.message_type === 'text' ? msg.content : `📷 ${msg.message_type === 'image' ? 'Photo' : 'Vidéo'}`,
            last_message_at: msg.created_at,
          });
        }
      }

      // Récupérer les infos des subscribers
      const subscriberIds = Array.from(conversationMap.keys());
      if (subscriberIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', subscriberIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return Array.from(conversationMap.values()).map(conv => {
        const profile = profileMap.get(conv.subscriber_id);
        return {
          ...conv,
          subscriber_name: profile?.display_name || profile?.username || 'Utilisateur',
          subscriber_avatar: profile?.avatar_url,
          unread_count: 0,
        };
      });
    },
    enabled: !!creatorData?.id,
  });

  const handleDeleteConversation = async (subscriberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation.mutateAsync(subscriberId);
    refetch();
  };

  if (!creatorData) {
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
          creatorId={creatorData.id}
          creatorName={selectedConversation.subscriber_name}
          creatorAvatar={selectedConversation.subscriber_avatar || undefined}
          subscriberId={selectedConversation.subscriber_id}
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
                  key={conv.subscriber_id}
                  onClick={() => setSelectedConversation(conv)}
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
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Tous les messages avec {conv.subscriber_name} seront supprimés.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => handleDeleteConversation(conv.subscriber_id, e)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
      </CardContent>
    </Card>
  );
};

export default CreatorMessages;
