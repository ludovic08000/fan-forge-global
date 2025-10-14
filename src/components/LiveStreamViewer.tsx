/**
 * Composant pour regarder un live stream
 * Interface de visionnage pour les spectateurs
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Send, Circle, Heart, Lock } from 'lucide-react';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveStreamViewerProps {
  streamId: string;
}

/**
 * Lecteur de live stream pour spectateurs
 */
export const LiveStreamViewer = ({ streamId }: LiveStreamViewerProps) => {
  const { user } = useAuth();
  const { joinLiveStream, leaveLiveStream } = useLiveStream();
  const { messages, sendMessage } = useLiveChat(streamId);
  const [newMessage, setNewMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [likes, setLikes] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [liveStream, setLiveStream] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Charger les infos du stream et vérifier l'accès
   */
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Charger les infos du stream
        const { data: streamData, error: streamError } = await supabase
          .from('live_streams')
          .select('*, creator:creator_id(*)')
          .eq('id', streamId)
          .single();

        if (streamError) throw streamError;
        setLiveStream(streamData);

        // Si le stream n'est pas premium, accès direct
        if (!streamData.is_premium) {
          setHasAccess(true);
          setCheckingAccess(false);
          return;
        }

        // Vérifier l'accès via l'edge function
        if (user) {
          const { data, error } = await supabase.functions.invoke('verify-live-access', {
            body: { liveStreamId: streamId },
          });

          if (error) throw error;
          setHasAccess(data.hasAccess);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [streamId, user]);

  /**
   * Rejoindre le live si accès autorisé
   */
  useEffect(() => {
    if (user && hasAccess) {
      joinLiveStream(streamId);
    }

    return () => {
      if (user && hasAccess) {
        leaveLiveStream(streamId);
      }
    };
  }, [streamId, user, hasAccess]);

  /**
   * Auto-scroll vers le dernier message
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Envoyer un message dans le chat
   */
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    if (!user) {
      toast.error('Connectez-vous pour participer au chat');
      return;
    }

    sendMessage(newMessage);
    setNewMessage('');
  };

  /**
   * Liker le live
   */
  const handleLike = () => {
    if (!user) {
      toast.error('Connectez-vous pour liker');
      return;
    }
    setLikes(likes + 1);
    toast.success('❤️');
  };

  /**
   * Gérer le paiement pour accéder au live
   */
  const handlePayForAccess = async () => {
    if (!user) {
      toast.error('Connectez-vous pour accéder à ce live');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-live-checkout', {
        body: { liveStreamId: streamId },
      });

      if (error) throw error;

      if (data.hasAccess) {
        toast.success('Vous avez déjà accès à ce live!');
        setHasAccess(true);
        return;
      }

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erreur lors du paiement');
    }
  };

  if (checkingAccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Vérification de l'accès...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess && liveStream?.is_premium) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{liveStream.title}</h2>
              <p className="text-muted-foreground mb-4">
                Ce live est réservé aux abonnés ou nécessite un paiement unique
              </p>
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(liveStream.price)}
                </p>
                <p className="text-sm text-muted-foreground">Accès unique</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button onClick={handlePayForAccess} className="w-full" variant="premium">
                Acheter l'accès
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.history.back()}
              >
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Lecteur vidéo */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Badge EN DIRECT */}
                <div className="absolute top-4 left-4">
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Circle className="h-2 w-2 fill-current" />
                    EN DIRECT
                  </Badge>
                </div>

                {/* Compteur de spectateurs */}
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{viewerCount}</span>
                </div>

                {/* Bouton like flottant */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-4 right-4 rounded-full"
                  onClick={handleLike}
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Titre du live</h1>
                  <p className="text-muted-foreground">Description du live stream...</p>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>CR</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">Nom du créateur</p>
                    <p className="text-sm text-muted-foreground">1.2K abonnés</p>
                  </div>
                  <Button variant="default" className="ml-auto">
                    S'abonner
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat en direct */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Chat en direct</span>
              <Badge variant="secondary">{messages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {msg.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm truncate">
                            {msg.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input message */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder={user ? 'Envoyer un message...' : 'Connectez-vous pour participer'}
                  disabled={!user}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!user || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
