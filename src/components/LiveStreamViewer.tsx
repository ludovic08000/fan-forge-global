/**
 * Composant pour regarder un live stream
 * Interface de visionnage pour les spectateurs
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Send, Circle, Heart, Lock, ChevronUp, Wifi, WifiOff, Loader2, Volume2, Clock } from 'lucide-react';
import { LiveTimer } from '@/components/live/LiveTimer';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChat, ContentOffer, PaidMedia } from '@/hooks/useLiveChat';
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
import { EmojiPicker } from '@/components/live/EmojiPicker';
import { PaidMediaUpload } from '@/components/live/PaidMediaUpload';
import { PaidMediaMessage } from '@/components/live/PaidMediaMessage';
import { LiveTipButton } from '@/components/live/LiveTipButton';
import { TipMessage } from '@/components/live/TipMessage';
import { EmbeddedCheckout } from '@/components/EmbeddedCheckout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LiveStreamViewerProps {
  streamId: string;
}

/**
 * Lecteur de live stream pour spectateurs
 */
export const LiveStreamViewer = ({ streamId }: LiveStreamViewerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { joinLiveStream, leaveLiveStream } = useLiveStream();
  const { messages, sendMessage, sendContentOffer, sendPaidMedia, hasMore, loadMore, loading: chatLoading } = useLiveChat(streamId);
  const { trackError } = useAnalytics();
  const { isUserBanned, settings } = useLiveModeration(streamId);
  const [creatorData, setCreatorData] = useState<any>(null);
  // Activer la protection anti-capture sur le live
  useContentProtection(true);
  
  // LiveKit viewer hook
  const { isConnected, isConnecting, error: liveKitError, connect, disconnect, setVideoRef, needsUserGesture, enableAudio } = useLiveKitViewer(streamId);
  
  const [newMessage, setNewMessage] = useState('');
  const [likes, setLikes] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [liveStream, setLiveStream] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  /**
   * Écouter les changements de statut du live en temps réel via Supabase Realtime
   * + Polling de secours toutes les 5 secondes pour garantir la redirection
   */
  useEffect(() => {
    if (!streamId) return;

    let isRedirecting = false;

    // Fonction pour vérifier le statut et rediriger si terminé
    const checkAndRedirect = (status: string) => {
      if (isRedirecting) return;
      if (!isCreator && (status === 'ended' || status === 'cancelled')) {
        isRedirecting = true;
        console.log('[LiveStreamViewer] Live ended, redirecting viewer...');
        toast.info('🔴 Le live est terminé ! Merci d\'avoir regardé.', {
          duration: 5000,
          description: 'Vous avez été redirigé vers votre espace.'
        });
        navigate('/subscriptions');
      }
    };

    // Subscription temps réel pour les changements de statut
    const channel = supabase
      .channel(`live-stream-status-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`
        },
        (payload) => {
          console.log('[LiveStreamViewer] Realtime update:', payload.new);
          const newData = payload.new as any;
          
          // Mettre à jour le state du liveStream avec le nouveau statut
          setLiveStream((prev: any) => {
            if (prev?.status !== newData.status) {
              console.log('[LiveStreamViewer] Status changed:', prev?.status, '->', newData.status);
            }
            return prev ? { ...prev, status: newData.status, viewer_count: newData.viewer_count, started_at: newData.started_at } : prev;
          });

          checkAndRedirect(newData.status);
        }
      )
      .subscribe((status) => {
        console.log('[LiveStreamViewer] Realtime subscription status:', status);
      });

    // Polling de secours toutes les 5 secondes pour garantir la redirection
    const pollInterval = setInterval(async () => {
      if (isRedirecting) return;
      
      try {
        const { data, error } = await supabase
          .from('public_live_streams')
          .select('status')
          .eq('id', streamId)
          .maybeSingle();

        if (error) {
          console.error('[LiveStreamViewer] Polling error:', error);
          return;
        }

        if (data) {
          console.log('[LiveStreamViewer] Poll check - status:', data.status);
          checkAndRedirect(data.status);
        } else {
          // Le live n'existe plus dans la vue publique = probablement terminé
          console.log('[LiveStreamViewer] Stream not found in public view, redirecting...');
          checkAndRedirect('ended');
        }
      } catch (err) {
        console.error('[LiveStreamViewer] Polling error:', err);
      }
    }, 5000);

    return () => {
      console.log('[LiveStreamViewer] Cleaning up realtime subscription and polling');
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [streamId, isCreator, navigate]);


  /**
   * Charger les infos du stream et vérifier l'accès avec gestion d'erreurs
   * Optimisé pour donner l'accès immédiat au créateur
   */
  useEffect(() => {
    let isMounted = true;
    
    const checkAccess = async () => {
      if (!isMounted) return;
      
      try {
        // Charger stream + créateur en parallèle pour plus de rapidité
        const streamPromise = supabase
          .from('public_live_streams')
          .select('*')
          .eq('id', streamId)
          .maybeSingle();

        const { data: streamData, error: streamError } = await streamPromise;

        if (!isMounted) return;
        if (streamError) throw streamError;
        
        if (!streamData) {
          toast.error('Live introuvable');
          setCheckingAccess(false);
          return;
        }
        
        setLiveStream(streamData);

        // Charger le créateur en parallèle avec la vérification d'accès si nécessaire
        const creatorPromise = supabase
          .from('public_creators')
          .select('*')
          .eq('id', streamData.creator_id)
          .maybeSingle();

        // Vérification rapide: si user_id correspond au creator_id via la table creators
        // On peut checker directement si l'utilisateur est le créateur
        if (user) {
          const { data: creatorCheck } = await supabase
            .from('creators')
            .select('user_id')
            .eq('id', streamData.creator_id)
            .maybeSingle();
          
          if (!isMounted) return;
          
          if (creatorCheck?.user_id === user.id) {
            // L'utilisateur est le créateur - accès immédiat
            setIsCreator(true);
            setHasAccess(true);
            
            // Charger les données du créateur en arrière-plan
            creatorPromise.then(({ data }) => {
              if (isMounted) setCreatorData(data);
            });
            
            setCheckingAccess(false);
            return;
          }
        }

        // Pour les non-créateurs, charger les infos créateur
        const { data: fetchedCreatorData } = await creatorPromise;
        if (!isMounted) return;
        setCreatorData(fetchedCreatorData);

        // Si le stream est gratuit (is_premium = false), accès direct
        if (!streamData.is_premium) {
          setHasAccess(true);
          setCheckingAccess(false);
          return;
        }

        // Vérifier l'accès via l'edge function pour les lives premium
        if (user) {
          const { data, error } = await supabase.functions.invoke('verify-live-access', {
            body: { liveStreamId: streamId },
          });

          if (!isMounted) return;
          if (error) throw error;
          setHasAccess(data.hasAccess);
        } else {
          setHasAccess(false);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        if (isMounted) {
          setCheckingAccess(false);
        }
      }
    };

    checkAccess();
    
    return () => {
      isMounted = false;
    };
  }, [streamId, user?.id]);

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
        <div className="max-w-4xl mx-auto">
          {/* Aperçu flou du live */}
          <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
            {/* Fond animé simulant un live */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-primary/10 animate-pulse" />
            
            {/* Thumbnail floue si disponible */}
            {liveStream.thumbnail_url ? (
              <img 
                src={liveStream.thumbnail_url} 
                alt="Aperçu"
                className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-muted to-primary/20" />
            )}
            
            {/* Overlay avec effet de profondeur */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
            
            {/* Badge EN DIRECT */}
            <div className="absolute top-4 left-4">
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <Circle className="h-2 w-2 fill-current" />
                EN DIRECT
              </Badge>
            </div>
            
            {/* Nombre de viewers */}
            <div className="absolute top-4 right-4">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {liveStream.viewer_count || 0} spectateurs
              </Badge>
            </div>
            
            {/* Contenu central */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Card className="w-full max-w-md mx-4 border-primary/20 shadow-2xl animate-scale-in">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{liveStream.title}</h2>
                    <p className="text-muted-foreground mb-4">
                      Ce live est réservé aux abonnés
                    </p>
                    
                    {creatorData && (
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{creatorData.stage_name?.[0] || 'C'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{creatorData.stage_name || 'Créateur'}</span>
                      </div>
                    )}
                    
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
                    {creatorData && (
                      <Button 
                        onClick={() => setShowCheckout(true)} 
                        className="w-full"
                      >
                        S'abonner au créateur
                      </Button>
                    )}
                    {liveStream.price > 0 && (
                      <Button onClick={handlePayForAccess} className="w-full" variant="premium">
                        Acheter l'accès unique
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => window.history.back()}
                    >
                      Retour
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Checkout Dialog */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="checkout-live-description">
            <DialogHeader>
              <DialogTitle>
                S'abonner à {creatorData?.stage_name || 'ce créateur'}
              </DialogTitle>
              <p id="checkout-live-description" className="text-sm text-muted-foreground">
                Complétez votre paiement pour accéder à ce live et tout le contenu premium
              </p>
            </DialogHeader>
            {showCheckout && liveStream?.creator_id && (
              <EmbeddedCheckout 
                creatorId={liveStream.creator_id} 
                onClose={() => {
                  setShowCheckout(false);
                  // Recharger la page pour vérifier l'accès après paiement
                  window.location.reload();
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
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
                    <p className="text-white">Connexion au stream...</p>
                  </div>
                )}
                
                {liveKitError && !isConnected && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                    <div className="text-center max-w-md px-4">
                      <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-6">
                        <Wifi className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                        <h3 className="text-white font-semibold mb-2">Mode aperçu limité</h3>
                        <p className="text-white/80 text-sm mb-4">
                          La diffusion vidéo n'est pas disponible dans l'environnement d'aperçu. 
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
                  muted
                  // @ts-ignore - webkit specific
                  webkit-playsinline="true"
                  x-webkit-airplay="allow"
                  className="w-full h-full object-cover"
                />
                
                {/* Badge EN DIRECT + Timer + Status LiveKit */}
                <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Circle className="h-2 w-2 fill-current" />
                    EN DIRECT
                  </Badge>
                  {liveStream?.started_at && (
                    <LiveTimer startedAt={liveStream.started_at} compact />
                  )}
                  {isConnected ? (
                    <Badge variant="secondary" className="gap-1 bg-green-500/90">
                      <Wifi className="h-3 w-3" />
                      Connecté
                    </Badge>
                  ) : isConnecting ? (
                    <Badge variant="secondary" className="gap-1 bg-yellow-500/90">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Connexion...
                    </Badge>
                  ) : null}
                </div>

                {/* Bouton activer audio Safari iOS */}
                {needsUserGesture && (
                  <Button
                    size="lg"
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 gap-2 z-20"
                    onClick={enableAudio}
                  >
                    <Volume2 className="h-5 w-5" />
                    Activer le son
                  </Button>
                )}

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
                  <h1 className="text-2xl font-bold mb-2">{liveStream?.title || 'Live en cours'}</h1>
                  <p className="text-muted-foreground">{liveStream?.description || ''}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {creatorData?.stage_name?.substring(0, 2).toUpperCase() || 'CR'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{creatorData?.stage_name || 'Créateur'}</p>
                    <p className="text-sm text-muted-foreground">
                      {creatorData?.total_subscribers || 0} abonnés
                    </p>
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
        <Card className="flex flex-col h-[600px] overflow-hidden border-2">
          {/* Header du chat */}
          <div className="px-4 py-3 border-b bg-card flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-semibold">Chat en direct</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{messages.length} messages</Badge>
              {isCreator && (
                <Badge className="bg-primary text-primary-foreground">Créateur</Badge>
              )}
            </div>
          </div>
          
          {/* Zone des messages */}
          <ScrollArea className="flex-1" ref={chatScrollRef}>
            <div className="p-3 space-y-1">
              {hasMore && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadMore}
                  disabled={chatLoading}
                  className="w-full text-xs mb-2"
                >
                  <ChevronUp className="h-3 w-3 mr-1" />
                  {chatLoading ? 'Chargement...' : 'Charger plus'}
                </Button>
              )}
              
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Aucun message. Soyez le premier !
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="py-1">
                    {msg.message_type === 'paid_media' && msg.content_offer ? (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-amber-500 text-white">
                              {msg.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-sm text-amber-600">{msg.username}</span>
                          <Badge variant="secondary" className="text-[10px]">Créateur</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <PaidMediaMessage
                          mediaId={msg.id}
                          type={(msg.content_offer as any)?.media_type || 'image'}
                          price={msg.content_offer.price}
                          thumbnailUrl={msg.content_offer.thumbnail_url}
                          creatorName={msg.username}
                          isLiveMedia={true}
                        />
                      </div>
                    ) : msg.message_type === 'tip' && msg.tip_data ? (
                      /* Affichage animé pour les tips */
                      <TipMessage
                        senderName={msg.tip_data.sender_name}
                        amount={msg.tip_data.amount}
                        message={msg.tip_data.message}
                        currency={msg.tip_data.currency}
                      />
                    ) : msg.message_type === 'offer' && msg.content_offer ? (
                      <ContentOfferCard offer={msg.content_offer} />
                    ) : (
                      <div className="flex items-start gap-2 hover:bg-muted/30 rounded px-1 py-0.5 group">
                        <Avatar className="h-6 w-6 mt-0.5">
                          <AvatarFallback className="text-[10px]">
                            {msg.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm mr-2">{msg.username}</span>
                          <span className="text-sm break-words">{msg.message}</span>
                        </div>
                        {isCreator && (
                          <MessageModeration
                            messageId={msg.id}
                            userId={msg.user_id}
                            username={msg.username}
                            liveStreamId={streamId}
                            isCreator={isCreator}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Barre de modération créateur */}
          {isCreator && (
            <div className="px-3 py-2 border-t bg-primary/5 flex items-center gap-2 flex-wrap">
              <LiveModerationPanel liveStreamId={streamId} isCreator={isCreator} />
              <ContentOfferSelector 
                creatorId={liveStream?.creator_id} 
                onSelectContent={(content) => sendContentOffer(content)}
              />
            </div>
          )}

          {/* Zone de saisie - IDENTIQUE pour tous */}
          <div className="p-3 border-t bg-muted/20">
            {!user ? (
              <p className="text-center text-sm text-muted-foreground py-1">
                Connectez-vous pour chatter
              </p>
            ) : (
              <div className="flex items-center gap-2">
                {/* Emoji picker - pour tous */}
                <EmojiPicker onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)} />
                
                {/* Bouton tip - pour tous les utilisateurs (sauf le créateur) */}
                {!isCreator && creatorData?.is_accepting_tips && (
                  <LiveTipButton
                    liveStreamId={streamId}
                    creatorId={liveStream?.creator_id}
                    creatorName={creatorData?.stage_name}
                  />
                )}
                
                {/* Bouton média payant - SEULEMENT créateur */}
                {isCreator && (
                  <PaidMediaUpload
                    liveStreamId={streamId}
                    creatorId={liveStream?.creator_id}
                    onMediaSent={(media) => sendPaidMedia(media)}
                  />
                )}
                
                {/* Champ de texte */}
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Écrire un message..."
                  className="flex-1"
                />
                
                {/* Bouton envoyer */}
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
