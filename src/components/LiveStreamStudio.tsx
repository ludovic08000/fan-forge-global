/**
 * Composant studio de live streaming pour les créateurs
 * Permet de créer, configurer et diffuser un live avec tracking des revenus
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, Users, Circle, BarChart3, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useLiveStream } from '@/hooks/useLiveStream';
import { useLiveChat } from '@/hooks/useLiveChat';
import { useLiveKitBroadcast } from '@/hooks/useLiveKitBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Studio de diffusion pour créateurs
 */
export const LiveStreamStudio = () => {
  const { createLiveStream, startLiveStream, endLiveStream } = useLiveStream();
  const navigate = useNavigate();
  const [currentStream, setCurrentStream] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [testMode, setTestMode] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { messages, sendMessage } = useLiveChat(currentStream?.id || '');
  
  // LiveKit broadcast hook
  const { isStreaming, isConnecting: isLiveKitConnecting, connectedViewers, error: liveKitError, startBroadcast, stopBroadcast } = useLiveKitBroadcast();

  // Référence pour stocker l'ID du stream actuel pour le cleanup
  const currentStreamIdRef = useRef<string | null>(null);

  // Mettre à jour la référence quand currentStream change
  useEffect(() => {
    currentStreamIdRef.current = currentStream?.id || null;
  }, [currentStream]);

  /**
   * Terminer le live automatiquement quand le créateur quitte la page
   */
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (currentStreamIdRef.current && isLive) {
        // Terminer le live de manière synchrone avec sendBeacon
        const url = `https://usjxcgauyvdocngfkhys.supabase.co/rest/v1/live_streams?id=eq.${currentStreamIdRef.current}`;
        const body = JSON.stringify({
          status: 'ended',
          ended_at: new Date().toISOString()
        });
        
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        
        // Message de confirmation pour l'utilisateur
        e.preventDefault();
        e.returnValue = 'Votre live est en cours. Êtes-vous sûr de vouloir quitter?';
        return e.returnValue;
      }
    };

    const handleVisibilityChange = async () => {
      // Ne pas terminer sur simple changement d'onglet, seulement sur fermeture
      if (document.visibilityState === 'hidden' && currentStreamIdRef.current && isLive) {
        console.log('Page hidden while live - keeping stream active');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLive]);

  /**
   * Initialiser les dispositifs média avec fallbacks mobile
   */
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        setMediaError(null);
        
        // Détecter si mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        const constraints: MediaStreamConstraints = {
          video: isMobile ? {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          } : {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsMediaReady(true);
      } catch (error) {
        console.error('Erreur accès média:', error);
        
        // Fallback: essayer avec des contraintes basiques
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          
          streamRef.current = basicStream;
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
          }
          setIsMediaReady(true);
          
          toast.warning('Qualité vidéo réduite pour compatibilité');
        } catch (fallbackError) {
          console.error('Erreur accès média (fallback):', fallbackError);
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Erreur inconnue';
          setMediaError(`Impossible d'accéder à la caméra: ${errorMessage}`);
          toast.error('Impossible d\'accéder à la caméra ou au microphone');
        }
      }
    };

    initializeMedia();

    // Gérer le changement d'orientation sur mobile
    const handleOrientationChange = () => {
      if (streamRef.current && videoRef.current) {
        const tracks = streamRef.current.getVideoTracks();
        tracks.forEach(track => {
          const settings = track.getSettings();
          console.log('Video settings after orientation change:', settings);
        });
      }
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      // Cleanup proper des streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log('Track stopped:', track.kind);
        });
        streamRef.current = null;
      }
      
      // Cleanup video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      window.removeEventListener('orientationchange', handleOrientationChange);
      
      // Terminer le live si encore actif lors du démontage du composant
      if (currentStreamIdRef.current) {
        endLiveStream(currentStreamIdRef.current);
      }
    };
  }, []);

  /**
   * Créer et démarrer le live avec tracking des revenus
   */
  const handleStartLive = async () => {
    if (!title.trim()) {
      toast.error('Veuillez entrer un titre pour le live');
      return;
    }

    try {
      // Créer le live stream
      const { data: stream } = await createLiveStream({
        title,
        description,
        is_premium: isPremium,
        price: isPremium ? price : 0,
      });

      if (!stream) return;

      setCurrentStream(stream);

      // Démarrer le live
      await startLiveStream(stream.id);
      setIsLive(true);
      
      // Démarrer la diffusion LiveKit avec le streamId
      await startBroadcast(stream.id, streamRef.current);
      console.log('[Studio] LiveKit broadcast started for stream:', stream.id);
      
      // Démarrer le tracking des revenus par minute
      const revenueInterval = setInterval(async () => {
        const liveStartTime = new Date(stream.started_at || Date.now());
        const currentTime = Date.now();
        const minuteNumber = Math.floor((currentTime - liveStartTime.getTime()) / 60000);
        
        try {
          await supabase.functions.invoke('track-live-revenue', {
            body: {
              liveStreamId: stream.id,
              minuteNumber,
            },
          });
        } catch (error) {
          console.error('Erreur tracking revenus:', error);
        }
      }, 60000); // Toutes les minutes
      
      // Stocker l'interval pour le cleanup
      (window as any).liveRevenueInterval = revenueInterval;
      
      // Notifier les abonnés
      try {
        await supabase.functions.invoke('notify-live-start', {
          body: {
            live_stream_id: stream.id,
            creator_id: stream.creator_id,
          },
        });
        console.log('Notifications envoyées aux abonnés');
      } catch (notifError) {
        console.error('Erreur envoi notifications:', notifError);
        // Ne pas bloquer le démarrage si les notifications échouent
      }
      
      toast.success('Vous êtes en direct!');
    } catch (error) {
      console.error('Erreur démarrage live:', error);
      toast.error('Impossible de démarrer le live');
    }
  };

  /**
   * Arrêter le live avec cleanup complet
   */
  const handleStopLive = async () => {
    if (!currentStream) return;

    try {
      // Arrêter la diffusion LiveKit
      await stopBroadcast();
      console.log('[Studio] LiveKit broadcast stopped');
      
      await endLiveStream(currentStream.id);
      setIsLive(false);
      
      // Arrêter le tracking des revenus
      if ((window as any).liveRevenueInterval) {
        clearInterval((window as any).liveRevenueInterval);
        (window as any).liveRevenueInterval = null;
      }
      
      // Arrêter tous les tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log('Track stopped on end:', track.kind);
        });
      }

      toast.success('Live terminé');
      
      // Réinitialiser
      setCurrentStream(null);
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Erreur arrêt live:', error);
      toast.error('Erreur lors de l\'arrêt du live');
    }
  };

  /**
   * Basculer la vidéo
   */
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  /**
   * Basculer l'audio
   */
  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Prévisualisation vidéo */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Studio Live</CardTitle>
              {isLive && (
                <Badge variant="destructive" className="gap-1 animate-pulse">
                  <Circle className="h-2 w-2 fill-current" />
                  EN DIRECT
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Erreur média */}
            {mediaError && !testMode && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                <VideoOff className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-destructive">{mediaError}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  La caméra n'est pas accessible dans l'aperçu. Utilisez le mode test ou publiez votre app.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setTestMode(true)}
                >
                  Activer le mode test (sans caméra)
                </Button>
              </div>
            )}
            
            {/* Mode test actif */}
            {testMode && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <Video className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Mode test activé</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Le live fonctionnera mais sans diffusion vidéo. Publiez l'app pour utiliser la caméra.
                </p>
              </div>
            )}
            
            {/* Prévisualisation */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {!testMode ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Video className="h-16 w-16 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Mode test - Pas de vidéo</p>
                  </div>
                </div>
              )}
              
              {/* Message si pas encore de média */}
              {!isMediaReady && !mediaError && !testMode && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-sm">Initialisation de la caméra...</p>
                  </div>
                </div>
              )}
              
              {/* Compteur de spectateurs LiveKit */}
              {isLive && (
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="bg-black/70 text-white px-3 py-1 rounded-full flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{connectedViewers}</span>
                  </div>
                  {isLiveKitConnecting ? (
                    <div className="bg-yellow-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Connexion LiveKit...</span>
                    </div>
                  ) : isStreaming ? (
                    <div className="bg-green-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span className="text-xs">LiveKit actif</span>
                    </div>
                  ) : liveKitError ? (
                    <div className="bg-red-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2">
                      <WifiOff className="h-4 w-4" />
                      <span className="text-xs">Erreur</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Contrôles média */}
            {!testMode && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant={isVideoEnabled ? 'default' : 'destructive'}
                  size="icon"
                  onClick={toggleVideo}
                  disabled={!isMediaReady}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isAudioEnabled ? 'default' : 'destructive'}
                  size="icon"
                  onClick={toggleAudio}
                  disabled={!isMediaReady}
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Boutons contrôle live */}
            {!isLive ? (
              <Button 
                onClick={handleStartLive} 
                className="w-full" 
                size="lg"
                disabled={(!isMediaReady && !testMode) || (!!mediaError && !testMode)}
              >
                <Video className="h-4 w-4 mr-2" />
                {testMode ? 'Démarrer le live (mode test)' : 'Démarrer le live'}
              </Button>
            ) : (
              <Button
                onClick={handleStopLive}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                Arrêter le live
              </Button>
            )}
            
            {currentStream && (
              <Button
                onClick={() => navigate(`/live-analytics/${currentStream.id}`)}
                variant="outline"
                className="w-full mt-2"
                size="lg"
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Voir les analytics
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du live</CardTitle>
              <CardDescription>
                Configurez les paramètres de votre diffusion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Mon super live..."
                  disabled={isLive}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre live..."
                  rows={3}
                  disabled={isLive}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Contenu premium</Label>
                  <p className="text-sm text-muted-foreground">
                    Réservé aux abonnés payants
                  </p>
                </div>
                <Switch
                  checked={isPremium}
                  onCheckedChange={setIsPremium}
                  disabled={isLive}
                />
              </div>

              {isPremium && (
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value))}
                    disabled={isLive}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat en direct */}
          {isLive && (
            <Card>
              <CardHeader>
                <CardTitle>Chat en direct</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 overflow-y-auto space-y-2 mb-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-semibold">{msg.username}: </span>
                      <span>{msg.message}</span>
                    </div>
                  ))}
                </div>
                <Input
                  placeholder="Envoyer un message..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
