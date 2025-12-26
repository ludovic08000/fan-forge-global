import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, ArrowRight, Trash2 } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { toast } from 'sonner';
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
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  last_message: string | null;
  last_message_date: string | null;
  unread_count: number;
}

const Messages = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadConversations = async () => {
      try {
        // Charger les conversations selon le rôle
        if (userRole === 'creator') {
          // Pour les créateurs : charger les conversations avec leurs abonnés
          const { data: creatorData } = await supabase
            .from('creators')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (creatorData) {
            const { data: messages } = await supabase
              .from('private_messages')
              .select(`
                subscriber_id,
                content,
                created_at
              `)
              .eq('creator_id', creatorData.id)
              .eq('is_deleted', false)
              .order('created_at', { ascending: false });

            // Grouper par subscriber
            const conversationsMap = new Map<string, Conversation>();
            
            for (const msg of messages || []) {
              if (!conversationsMap.has(msg.subscriber_id)) {
                // Charger le profil du subscriber
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('display_name, username, avatar_url')
                  .eq('user_id', msg.subscriber_id)
                  .single();

                conversationsMap.set(msg.subscriber_id, {
                  creator_id: msg.subscriber_id,
                  creator_name: profile?.display_name || profile?.username || 'Utilisateur',
                  creator_avatar: profile?.avatar_url,
                  last_message: msg.content,
                  last_message_date: msg.created_at,
                  unread_count: 0
                });
              }
            }

            setConversations(Array.from(conversationsMap.values()));
          }
        } else {
          // Pour les abonnés : charger les conversations avec les créateurs
          const { data: messages } = await supabase
            .from('private_messages')
            .select(`
              creator_id,
              content,
              created_at
            `)
            .eq('subscriber_id', user.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

          // Grouper par créateur
          const conversationsMap = new Map<string, Conversation>();
          
          for (const msg of messages || []) {
            if (!conversationsMap.has(msg.creator_id)) {
              // Charger le profil du créateur
              const { data: creatorData } = await supabase
                .from('creators')
                .select('id, stage_name, user_id')
                .eq('id', msg.creator_id)
                .single();

              let avatar = null;
              if (creatorData) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('avatar_url')
                  .eq('user_id', creatorData.user_id)
                  .single();
                avatar = profile?.avatar_url;
              }

              conversationsMap.set(msg.creator_id, {
                creator_id: msg.creator_id,
                creator_name: creatorData?.stage_name || 'Créateur',
                creator_avatar: avatar,
                last_message: msg.content,
                last_message_date: msg.created_at,
                unread_count: 0
              });
            }
          }

          setConversations(Array.from(conversationsMap.values()));
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user, userRole, navigate]);

  const handleDeleteConversation = async (conversationId: string) => {
    if (!user) return;
    
    setDeletingId(conversationId);
    try {
      if (userRole === 'creator') {
        // Pour les créateurs : supprimer les messages avec cet abonné
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (creatorData) {
          const { error } = await supabase
            .from('private_messages')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('creator_id', creatorData.id)
            .eq('subscriber_id', conversationId);

          if (error) throw error;
        }
      } else {
        // Pour les abonnés : supprimer les messages avec ce créateur
        const { error } = await supabase
          .from('private_messages')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('subscriber_id', user.id)
          .eq('creator_id', conversationId);

        if (error) throw error;
      }

      setConversations(prev => prev.filter(c => c.creator_id !== conversationId));
      toast.success('Conversation supprimée');
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <SEOHead
        title="Messages privés"
        description="Gérez vos conversations privées sur Crub"
      />
      
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-primary" />
          Messages
        </h1>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">Aucune conversation</h2>
              <p className="text-muted-foreground">
                {userRole === 'creator' 
                  ? "Vos abonnés peuvent vous envoyer des messages privés"
                  : "Abonnez-vous à des créateurs pour leur envoyer des messages"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Card key={conv.creator_id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <Link 
                    to={`/chat/${conv.creator_id}`}
                    className="flex items-center gap-4 flex-1 min-w-0"
                  >
                    <Avatar className="h-14 w-14 border-2 border-primary/20">
                      <AvatarImage src={conv.creator_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {conv.creator_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{conv.creator_name}</h3>
                        {conv.unread_count > 0 && (
                          <Badge variant="default" className="text-xs">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message}
                        </p>
                      )}
                      {conv.last_message_date && (
                        <p className="text-xs text-muted-foreground/70">
                          {new Date(conv.last_message_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Link>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId === conv.creator_id}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer cette conversation avec {conv.creator_name} ? 
                          Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteConversation(conv.creator_id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
