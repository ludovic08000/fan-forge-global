import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ModernPrivateChat from './ModernPrivateChat';

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
  const { data: conversations, isLoading } = useQuery({
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
          unread_count: 0, // À implémenter si besoin
        };
      });
    },
    enabled: !!creatorData?.id,
  });

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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedConversation(null)}
            className="text-primary hover:underline"
          >
            ← Retour aux conversations
          </button>
          <span className="text-muted-foreground">
            Conversation avec {selectedConversation.subscriber_name}
          </span>
        </div>
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
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.subscriber_id}
                  onClick={() => setSelectedConversation(conv)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <Avatar>
                    <AvatarImage src={conv.subscriber_avatar || undefined} />
                    <AvatarFallback>
                      {conv.subscriber_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{conv.subscriber_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <Badge variant="default" className="shrink-0">
                      {conv.unread_count}
                    </Badge>
                  )}
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
