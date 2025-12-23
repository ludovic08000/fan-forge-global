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
import { Users, Send, Circle, Heart, Lock, ChevronUp, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChat, ContentOffer } from '@/hooks/useLiveChat';
import { useLiveKitViewer } from '@/hooks/useLiveKitViewer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAnalytics } from '@/lib/analytics';
import { LiveModerationPanel, MessageModeration } from '@/components/LiveModerationPanel';
import { useLiveModeration } from '@/hooks/useLiveModeration';
import { ContentOfferCard, ContentOfferSelector } from '@/components/LiveContentOffer';
import { useContentProtection } from '@/hooks/useContentProtection';
import { ProtectedMedia } from '@/components/ProtectedMedia';

interface LiveStreamViewerProps {
  streamId: string;
}

/**
 * Lecteur de live stream pour spectateurs
 */
export const LiveStreamViewer = ({ streamId }: LiveStreamViewerProps) => {
  const { user } = useAuth();
  const { joinLiveStream, leaveLiveStream } = useLiveStream();
  const { messages, sendMessage, sendContentOffer, hasMore, loadMore, loading: chatLoading } = useLiveChat(streamId);
  const { trackError } = useAnalytics();
  const { isUserBanned, settings } = useLiveModeration(streamId);
  
  // Activer la protection anti-capture sur le live
  useContentProtection(true);
  
  // LiveKit viewer hook
  const { isConnected, isConnecting, error: liveKitError, connect, disconnect, setVideoRef } = useLiveKitViewer(streamId);
  
  const [newMessage, setNewMessage] = useState('');
  const [likes, setLikes] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [liveStream, setLiveStream] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  /**
   * Charger les infos du stream et vérifier l'accès avec gestion d'erreurs
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

        // Vérifier si l'utilisateur est le créateur
        if (user && streamData.creator?.user_id === user.id) {
          setIsCreator(true);
          setHasAccess(true);
          setCheckingAccess(false);
          return;
        }

        // Si le stream est gratuit (is_premium false OU prix = 0), accès direct
        if (!streamData.is_premium || streamData.price === 0 || streamData.price === null) {
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
        trackError(error as Error, { context: 'verify_live_access', streamId });
        setHasAccess(false);
        toast.error('Erreur lors de la vérification de l\'accès au live');
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [streamId, user, trackError]);

  /**
   * Rejoindre le live si accès autorisé
   */
  useEffect(() => {
    if (!user || !hasAccess) return;
    
    // Joindre le stream
    joinLiveStream(streamId);
    
    // Se connecter au stream LiveKit (seulement une fois)
    const connectTimeout = setTimeout(() => {
      connect();
    }, 100);

    return () => {
      clearTimeout(connectTimeout);
      leaveLiveStream(streamId);
      disconnect();
    };
    // On ne met PAS connect/disconnect dans les deps car ils changent à chaque render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, user?.id, hasAccess]);

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

    // Vérifier si l'utilisateur est banni
    if (isUserBanned(user.id)) {
      toast.error('Vous êtes banni de ce chat');
      return;
    }

    // Vérifier le mode abonnés uniquement
    if (settings.subscribers_only && !isCreator) {
      toast.error('Seuls les abonnés peuvent chatter');
      return;
    }

    // Vérifier le slow mode
    if (settings.slow_mode_enabled && !isCreator) {
      const now = Date.now();
      const timeSinceLastMessage = (now - lastMessageTime) / 1000;
      if (timeSinceLastMessage < settings.slow_mode_interval) {
        const remaining = Math.ceil(settings.slow_mode_interval - timeSinceLastMessage);
        toast.error(`Attendez ${remaining}s avant d'envoyer un message`);
        return;
      }
      setLastMessageTime(now);
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
                Ce live est réservé aux abonnés
              </p>
              
              {liveStream.price > 0 && (
                <div className="p-4 bg-muted rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Ou accès unique :</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(liveStream.price)}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {liveStream.price > 0 && (
                <Button onClick={handlePayForAccess} className="w-full" variant="premium">
                  Acheter l'accès
                </Button>
              )}
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
                {/* Affichage du stream LiveKit */}
                {isConnecting && !isConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-white">Connexion au stream LiveKit...</p>
                  </div>
                )}
                
                {liveKitError && !isConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                    <div className="text-center max-w-md px-4">
                      <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-6">
                        <Wifi className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                        <h3 className="text-white font-semibold mb-2">Mode aperçu limité</h3>
                        <p className="text-white/80 text-sm mb-4">
                          La diffusion vidéo LiveKit n'est pas disponible dans l'environnement d'aperçu. 
                          Pour tester la réception vidéo, publiez l'application.
                        </p>
                        <Button onClick={connect} variant="secondary" size="sm">
                          Réessayer la connexion
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Badge EN DIRECT + Status LiveKit */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Circle className="h-2 w-2 fill-current" />
                    EN DIRECT
                  </Badge>
                  {isConnected ? (
                    <Badge variant="secondary" className="gap-1 bg-green-500/90">
                      <Wifi className="h-3 w-3" />
                      Crub connecté
                    </Badge>
                  ) : isConnecting ? (
                    <Badge variant="secondary" className="gap-1 bg-yellow-500/90">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Connexion...
                    </Badge>
                  ) : null}
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
            {/* Panel de modération et offres (créateurs uniquement) */}
            {isCreator && (
              <div className="px-4 pt-4 space-y-2">
                <LiveModerationPanel liveStreamId={streamId} isCreator={isCreator} />
                <ContentOfferSelector 
                  creatorId={liveStream?.creator_id} 
                  onSelectContent={(content) => sendContentOffer(content)}
                />
              </div>
            )}

            {/* Messages avec pagination */}
            <ScrollArea className="flex-1 px-4" ref={chatScrollRef}>
              <div className="space-y-3 py-4">
                {hasMore && (
                  <div className="flex justify-center pb-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={loadMore}
                      disabled={chatLoading}
                    >
                      <ChevronUp className="h-4 w-4 mr-2" />
                      {chatLoading ? 'Chargement...' : 'Charger plus'}
                    </Button>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    {/* Affichage différent pour les offres de contenu */}
                    {msg.message_type === 'offer' && msg.content_offer ? (
                      <ContentOfferCard offer={msg.content_offer} />
                    ) : (
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
                        {/* Boutons de modération (créateurs uniquement) */}
                        <MessageModeration
                          messageId={msg.id}
                          userId={msg.user_id}
                          username={msg.username}
                          liveStreamId={streamId}
                          isCreator={isCreator}
                        />
                      </div>
                    )}
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
