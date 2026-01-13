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
import { Video, VideoOff, Mic, MicOff, Users, Circle, BarChart3, Wifi, Loader2, SwitchCamera, Send, Shield, MessageCircle, ImageIcon, Clock, Copy, Eye, EyeOff } from 'lucide-react';
import { LiveTimer } from '@/components/live/LiveTimer';
import { EmojiPicker } from '@/components/live/EmojiPicker';
import { PaidMediaUpload } from '@/components/live/PaidMediaUpload';
import { TipMessage } from '@/components/live/TipMessage';
import { LiveModerationPanel, MessageModeration } from '@/components/LiveModerationPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [isPremium, setIsPremium] = useState(true); // Par défaut: abonnés seulement
  const [price, setPrice] = useState(0);
  const [enableRecording, setEnableRecording] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  // Mode test désactivé - la caméra est obligatoire
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { messages, sendMessage, sendPaidMedia } = useLiveChat(currentStream?.id || '');
  const [chatMessage, setChatMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const [showStreamKey, setShowStreamKey] = useState(false);

  // URL RTMP pour OBS
  const RTMP_URL = "rtmp://live.crub.app/live";

  // Récupérer l'ID du créateur
  useEffect(() => {
    const fetchCreatorId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: creator } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (creator) setCreatorId(creator.id);
      }
    };
    fetchCreatorId();
  }, []);
  
  // LiveKit broadcast hook
  const { isStreaming, isConnecting: isLiveKitConnecting, connectedViewers, error: liveKitError, startBroadcast, stopBroadcast, replaceVideoTrack } = useLiveKitBroadcast();

  // Référence pour stocker l'ID du stream actuel pour le cleanup
  const currentStreamIdRef = useRef<string | null>(null);
  // Ref pour savoir si on est vraiment en train de démount vs changement de deps
  const isUnmountingRef = useRef(false);

  // Mettre à jour la référence quand currentStream change
  useEffect(() => {
    currentStreamIdRef.current = currentStream?.id || null;
  }, [currentStream]);

  /**
   * Heartbeat toutes les 30 secondes pour signaler que le créateur est connecté
   */
  useEffect(() => {
    if (!isLive || !currentStreamIdRef.current) return;

    const sendHeartbeat = async () => {
      try {
        console.log('[Studio] Sending heartbeat for:', currentStreamIdRef.current);
        await fetch('https://usjxcgauyvdocngfkhys.supabase.co/functions/v1/live-heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            liveStreamId: currentStreamIdRef.current,
            action: 'heartbeat'
          }),
        });
      } catch (error) {
        console.error('[Studio] Heartbeat error:', error);
      }
    };

    // Envoyer immédiatement puis toutes les 30 secondes
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isLive]);

  /**
   * Terminer le live automatiquement quand le créateur quitte la page
   * IMPORTANT: Sur mobile (surtout iOS), on NE termine PAS le live sur visibilitychange
   * car ça se déclenche trop souvent (permissions, notifications, etc.)
   * On utilise seulement pagehide et beforeunload
   */
  useEffect(() => {
    const endLiveOnLeave = () => {
      if (currentStreamIdRef.current && isLive) {
        console.log('[Studio] Ending live on page leave:', currentStreamIdRef.current);
        const url = 'https://usjxcgauyvdocngfkhys.supabase.co/functions/v1/live-heartbeat';
        const body = JSON.stringify({
          liveStreamId: currentStreamIdRef.current,
          action: 'end'
        });
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    };

    // Gérer la fermeture/navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentStreamIdRef.current && isLive) {
        endLiveOnLeave();
        e.preventDefault();
        e.returnValue = 'Votre live est en cours. Êtes-vous sûr de vouloir quitter?';
        return e.returnValue;
      }
    };

    // Gérer pagehide (plus fiable que beforeunload sur mobile)
    // IMPORTANT: Ne se déclenche que quand l'utilisateur quitte vraiment la page
    const handlePageHide = (e: PageTransitionEvent) => {
      // persisted = true signifie que la page va dans le bfcache (pas une vraie fermeture)
      if (!e.persisted && currentStreamIdRef.current && isLive) {
        console.log('[Studio] Page hide (real navigation), ending live');
        endLiveOnLeave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // NOTE: On ne gère PAS visibilitychange sur mobile car il se déclenche
    // trop souvent (permissions caméra, notifications, app switcher, etc.)
    // Le heartbeat manquant (après 5min) terminera le live si vraiment abandonné

    // Cleanup - NE PAS terminer le live ici car ce cleanup s'exécute
    // aussi quand isLive change (pas seulement au unmount)
    // On se fie aux event handlers beforeunload et pagehide
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isLive]);

  /**
   * Cleanup final au démontage du composant uniquement
   */
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      // Terminer le live seulement si on démonte vraiment le composant
      if (currentStreamIdRef.current) {
        console.log('[Studio] Component unmounting, ending live:', currentStreamIdRef.current);
        const url = 'https://usjxcgauyvdocngfkhys.supabase.co/functions/v1/live-heartbeat';
        const body = JSON.stringify({
          liveStreamId: currentStreamIdRef.current,
          action: 'end'
        });
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    };
  }, []); // Deps vide = seulement au mount/unmount

  /**
   * Initialiser les dispositifs média avec fallbacks mobile améliorés
   */
  const initializeMedia = async () => {
    try {
      setMediaError(null);
      setIsMediaReady(false);
      
      // Vérifier si l'API mediaDevices est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Votre navigateur ne supporte pas l\'accès à la caméra');
      }

      // Détecter si mobile
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // Sur iOS, demander les permissions une à une peut être plus fiable
      if (isIOS) {
        try {
          // D'abord vérifier les permissions
          const permissions = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = permissions.some(d => d.kind === 'videoinput');
          const hasAudioInput = permissions.some(d => d.kind === 'audioinput');
          
          if (!hasVideoInput) {
            throw new Error('Aucune caméra détectée. Vérifiez les permissions dans Réglages > Safari');
          }
          if (!hasAudioInput) {
            console.warn('Aucun microphone détecté');
          }
        } catch (enumError) {
          console.warn('Impossible d\'énumérer les périphériques:', enumError);
        }
      }
      
      // Contraintes optimisées pour mobile
      const constraints: MediaStreamConstraints = {
        video: isMobileDevice ? {
          facingMode: { ideal: 'user' },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { ideal: 16/9 },
        } : {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 44100 },
        },
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Sur iOS, déclencher la lecture après l'assignation
          if (isIOS) {
            await videoRef.current.play().catch(() => {});
          }
        }
        setIsMediaReady(true);
      } catch (constraintError) {
        console.warn('Contraintes avancées échouées, essai simplifié:', constraintError);
        
        // Fallback 1: contraintes minimales
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true,
          });
          
          streamRef.current = simpleStream;
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            if (isIOS) await videoRef.current.play().catch(() => {});
          }
          setIsMediaReady(true);
        } catch (simpleError) {
          console.warn('Contraintes simples échouées, essai basique:', simpleError);
          
          // Fallback 2: le plus basique possible
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          
          streamRef.current = basicStream;
          if (videoRef.current) {
            videoRef.current.srcObject = basicStream;
            if (isIOS) await videoRef.current.play().catch(() => {});
          }
          setIsMediaReady(true);
        }
      }
    } catch (error: any) {
      console.error('Erreur accès média:', error);
      
      let errorMessage = 'Erreur inconnue';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permission refusée. Autorisez l\'accès à la caméra dans les paramètres de votre navigateur.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Aucune caméra ou microphone trouvé sur cet appareil.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'La caméra est peut-être utilisée par une autre application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Votre caméra ne supporte pas les paramètres demandés.';
      } else if (error.name === 'TypeError') {
        errorMessage = 'Erreur de configuration. Rechargez la page.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMediaError(errorMessage);
      toast.error('Impossible d\'accéder à la caméra ou au microphone');
    }
  };

  // Initialiser les médias au montage
  useEffect(() => {
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
        enable_recording: enableRecording,
      });

      if (!stream) return;

      setCurrentStream(stream);

      // Récupérer la clé de stream pour OBS
      try {
        const { data: key } = await supabase.rpc('get_own_stream_key', { 
          _live_stream_id: stream.id 
        });
        if (key) {
          setStreamKey(key);
          console.log('[Studio] Stream key retrieved for OBS');
        }
      } catch (keyError) {
        console.error('[Studio] Error fetching stream key:', keyError);
      }

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
   * Arrêter le live avec cleanup complet et réinitialisation de la caméra
   */
  const handleStopLive = async () => {
    if (!currentStream) return;

    try {
      // Arrêter la diffusion LiveKit
      await stopBroadcast();
      console.log('[Studio] Broadcast stopped');
      
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
        streamRef.current = null;
      }

      // Nettoyer la vidéo
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      toast.success('Live terminé');
      
      // Réinitialiser
      setCurrentStream(null);
      setStreamKey(null);
      setShowStreamKey(false);
      setTitle('');
      setDescription('');

      // Réinitialiser la caméra automatiquement après un court délai
      setTimeout(() => {
        console.log('[Studio] Reinitializing camera after live end');
        initializeMedia();
      }, 500);
      
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

  /**
   * Basculer entre caméra avant/arrière (mobile uniquement)
   * Utilise replaceVideoTrack pour un switch fluide sans déconnexion
   */
  const switchCamera = async () => {
    if (!isMobile || isSwitchingCamera) return;
    
    setIsSwitchingCamera(true);
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    
    try {
      // Arrêter les tracks vidéo existants
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
      }
      
      // Obtenir un nouveau stream avec la nouvelle caméra
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { exact: newFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false, // On garde l'audio existant
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      if (streamRef.current && newVideoTrack) {
        // Remplacer le track vidéo dans le stream existant
        const oldVideoTrack = streamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          streamRef.current.removeTrack(oldVideoTrack);
        }
        streamRef.current.addTrack(newVideoTrack);
        
        // Mettre à jour le srcObject local
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          // Forcer la lecture sur iOS
          await videoRef.current.play().catch(() => {});
        }
        
        // Republier le nouveau track vidéo sur LiveKit si on est en live
        if (isLive && isStreaming) {
          console.log('[Studio] Replacing video track on LiveKit...');
          const success = await replaceVideoTrack(newVideoTrack);
          if (success) {
            console.log('[Studio] Video track replaced successfully');
          } else {
            console.error('[Studio] Failed to replace video track');
            toast.error('Erreur de synchronisation vidéo');
          }
        }
        
        setFacingMode(newFacingMode);
        toast.success(newFacingMode === 'user' ? 'Caméra avant' : 'Caméra arrière');
      }
    } catch (error) {
      console.error('Erreur changement caméra:', error);
      toast.error('Impossible de changer de caméra');
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  return (
    <div className={`${isMobile ? 'min-h-screen pb-4' : 'container mx-auto py-8 px-4'}`}>
      {/* Layout mobile optimisé */}
      {isMobile ? (
        <div className="flex flex-col h-full">
          {/* Header mobile */}
          <div className="flex items-center justify-between p-3 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
            <h1 className="text-lg font-bold">Studio Live</h1>
            {isLive && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <Circle className="h-2 w-2 fill-current" />
                EN DIRECT
              </Badge>
            )}
          </div>

          {/* Vidéo plein écran mobile */}
          <div className="relative flex-1 bg-black min-h-[50vh]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              webkit-playsinline="true"
              className="w-full h-full object-cover"
            />
            
            {/* Loading state */}
            {!isMediaReady && !mediaError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm">Initialisation de la caméra...</p>
                </div>
              </div>
            )}
            
            {/* Erreur média */}
            {mediaError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
                <div className="text-center">
                  <VideoOff className="h-12 w-12 mx-auto mb-3 text-destructive" />
                  <p className="text-sm text-white mb-2">{mediaError}</p>
                  <Button size="sm" onClick={() => window.location.reload()}>
                    Réessayer
                  </Button>
                </div>
              </div>
            )}
            
            {/* Overlay infos live */}
            {isLive && (
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                <div className="bg-black/70 text-white px-3 py-1 rounded-full flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{connectedViewers}</span>
                </div>
                {isLiveKitConnecting ? (
                  <div className="bg-yellow-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : isStreaming ? (
                  <div className="bg-green-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                  </div>
                ) : null}
              </div>
            )}
            
            {/* LiveKit Error */}
            {liveKitError && isLive && (
              <div className="absolute bottom-16 left-2 right-2 bg-amber-500/90 text-white px-3 py-2 rounded-lg text-xs text-center">
                <p>Mode aperçu - Publiez l'app pour tester</p>
              </div>
            )}
            
            {/* Contrôles sur la vidéo */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 px-4">
              <Button
                variant={isVideoEnabled ? 'secondary' : 'destructive'}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleVideo}
                disabled={!isMediaReady}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              <Button
                variant={isAudioEnabled ? 'secondary' : 'destructive'}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleAudio}
                disabled={!isMediaReady}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={switchCamera}
                disabled={!isMediaReady || isSwitchingCamera}
              >
                {isSwitchingCamera ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <SwitchCamera className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Configuration et boutons mobile */}
          <div className="p-4 space-y-4 bg-background">
            {!isLive ? (
              <>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre du live *"
                  className="text-lg"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm">🔒 Réservé aux abonnés</span>
                  <Switch checked={isPremium} onCheckedChange={setIsPremium} />
                </div>
                <Button 
                  onClick={handleStartLive} 
                  className="w-full h-14 text-lg" 
                  size="lg"
                  disabled={!isMediaReady || !!mediaError || !title.trim()}
                >
                  <Video className="h-5 w-5 mr-2" />
                  Démarrer le live
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleStopLive}
                  variant="destructive"
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  Arrêter le live
                </Button>
                
                {/* Chat mobile moderne */}
                <div className="flex flex-col bg-background/95 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg overflow-hidden">
                  {/* Header du chat */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium text-foreground">Chat en direct</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {messages.length} msg
                    </Badge>
                  </div>
                  
                  {/* Zone des messages */}
                  <ScrollArea className="h-[180px] px-3 py-2">
                    <div className="space-y-2">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                          <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-sm">Aucun message pour l'instant</p>
                        </div>
                      ) : (
                        messages.slice(-15).map((msg) => (
                          msg.message_type === 'tip' && msg.tip_data ? (
                            <TipMessage
                              key={msg.id}
                              senderName={msg.username}
                              amount={msg.tip_data.amount}
                              currency={msg.tip_data.currency}
                              message={msg.tip_data.message}
                            />
                          ) : msg.message_type === 'paid_media' && msg.content_offer ? (
                            <div 
                              key={msg.id} 
                              className="flex items-center gap-2 p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30"
                            >
                              <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-amber-600">Média payant envoyé</p>
                                <p className="text-sm font-bold text-foreground">{msg.content_offer.price}€</p>
                              </div>
                            </div>
                          ) : (
                            <div 
                              key={msg.id} 
                              className="group flex items-start gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary-foreground">
                                  {msg.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-primary truncate">{msg.username}</p>
                                <p className="text-sm text-foreground break-words leading-snug">{msg.message}</p>
                              </div>
                            </div>
                          )
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Barre d'actions et saisie */}
                  <div className="p-3 border-t border-border/30 bg-muted/30">
                    {/* Boutons d'action */}
                    <div className="flex items-center gap-1 mb-3">
                      <EmojiPicker onEmojiSelect={(emoji) => setChatMessage(prev => prev + emoji)} />
                      
                      {creatorId && (
                        <PaidMediaUpload
                          liveStreamId={currentStream?.id || ''}
                          creatorId={creatorId}
                          onMediaSent={(media) => sendPaidMedia(media)}
                        />
                      )}
                    </div>
                    
                    {/* Zone de saisie */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Écrire un message..."
                          className="h-12 pl-4 pr-4 text-base rounded-full bg-background border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && chatMessage.trim()) {
                              sendMessage(chatMessage);
                              setChatMessage('');
                            }
                          }}
                        />
                      </div>
                      <Button
                        size="icon"
                        className="h-12 w-12 rounded-full shrink-0 shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        onClick={() => {
                          if (chatMessage.trim()) {
                            sendMessage(chatMessage);
                            setChatMessage('');
                          }
                        }}
                        disabled={!chatMessage.trim()}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
      /* Layout desktop original */
      <div className="grid gap-6 md:grid-cols-2">
        {/* Prévisualisation vidéo */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Studio Live</CardTitle>
              <div className="flex items-center gap-2">
                {isLive && currentStream?.started_at && (
                  <LiveTimer startedAt={currentStream.started_at} />
                )}
                {isLive && (
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <Circle className="h-2 w-2 fill-current" />
                    EN DIRECT
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Erreur média */}
            {mediaError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                <VideoOff className="h-8 w-8 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-destructive">{mediaError}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Vérifiez que la caméra n'est pas utilisée par une autre application et réessayez.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => window.location.reload()}
                >
                  Réessayer
                </Button>
              </div>
            )}
            
            {/* Prévisualisation */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Message si pas encore de média */}
              {!isMediaReady && !mediaError && (
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
                      <span className="text-xs">Connexion...</span>
                    </div>
                  ) : isStreaming ? (
                    <div className="bg-green-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      <span className="text-xs">Diffusion active</span>
                    </div>
                  ) : null}
                </div>
              )}
              
              {/* Erreur LiveKit (mode preview) */}
              {liveKitError && isLive && (
                <div className="absolute bottom-4 left-4 right-4 bg-amber-500/90 text-white px-3 py-2 rounded-lg text-xs text-center">
                  <p className="font-medium">Mode aperçu - Diffusion limitée</p>
                  <p className="opacity-80">La diffusion n'est pas disponible dans l'aperçu. Publiez l'app pour tester.</p>
                </div>
              )}
            </div>

            {/* Contrôles média */}
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
              {/* Bouton switch caméra - visible uniquement sur mobile */}
              {isMobile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={switchCamera}
                  disabled={!isMediaReady || isSwitchingCamera}
                  title={facingMode === 'user' ? 'Passer à la caméra arrière' : 'Passer à la caméra avant'}
                >
                  {isSwitchingCamera ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SwitchCamera className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Boutons contrôle live */}
            {!isLive ? (
              <Button 
                onClick={handleStartLive} 
                className="w-full" 
                size="lg"
                disabled={!isMediaReady || !!mediaError}
              >
                <Video className="h-4 w-4 mr-2" />
                Démarrer le live
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
                  <Label>🔒 Réservé aux abonnés</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPremium ? 'Seuls vos abonnés peuvent voir ce live' : 'Tout le monde peut voir ce live'}
                  </p>
                </div>
                <Switch
                  checked={isPremium}
                  onCheckedChange={setIsPremium}
                  disabled={isLive}
                />
              </div>

              {isPremium && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Ce live sera réservé à vos abonnés. 
                    Vous pouvez aussi définir un prix pour un accès unique.
                  </p>
                  <Label htmlFor="price">Prix accès unique (€) - optionnel</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0 = abonnés seulement"
                    disabled={isLive}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enregistrer le live</Label>
                  <p className="text-sm text-muted-foreground">
                    Le replay sera disponible après le live
                  </p>
                </div>
                <Switch
                  checked={enableRecording}
                  onCheckedChange={setEnableRecording}
                  disabled={isLive}
                />
              </div>

              {/* Section OBS - Clé de stream */}
              {currentStream && streamKey && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    <Label className="font-medium">Diffusion OBS</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">URL du serveur</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={RTMP_URL} 
                          readOnly 
                          className="text-xs font-mono bg-background"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(RTMP_URL);
                            toast.success('URL copiée');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Clé de stream</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type={showStreamKey ? "text" : "password"}
                          value={streamKey} 
                          readOnly 
                          className="text-xs font-mono bg-background"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowStreamKey(!showStreamKey)}
                        >
                          {showStreamKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(streamKey);
                            toast.success('Clé copiée');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Utilisez ces informations dans OBS Studio (Paramètres → Stream → Personnalisé)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat et Modération */}
          {isLive && currentStream && (
            <Card className="flex flex-col h-[450px]">
              <CardHeader className="pb-2">
                <Tabs defaultValue="chat" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="moderation" className="gap-1">
                      <Shield className="h-4 w-4" />
                      Modération
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="chat" className="mt-4 flex flex-col h-[340px]">
                    <ScrollArea className="flex-1 pr-4">
                      <div className="space-y-2">
                        {messages.map((msg) => (
                          msg.message_type === 'tip' && msg.tip_data ? (
                            <TipMessage
                              key={msg.id}
                              senderName={msg.username}
                              amount={msg.tip_data.amount}
                              currency={msg.tip_data.currency}
                              message={msg.tip_data.message}
                            />
                          ) : (
                            <div key={msg.id} className="group flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-primary">{msg.username}: </span>
                                <span className="text-foreground">{msg.message}</span>
                              </div>
                              {/* Bouton modération sur chaque message */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MessageModeration
                                  messageId={msg.id}
                                  userId={msg.user_id}
                                  username={msg.username}
                                  liveStreamId={currentStream.id}
                                  isCreator={true}
                                />
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Input chat avec emojis et média payant */}
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="flex gap-2">
                        <EmojiPicker onEmojiSelect={(emoji) => setChatMessage(prev => prev + emoji)} />
                        <Input
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Envoyer un message..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && chatMessage.trim()) {
                              sendMessage(chatMessage);
                              setChatMessage('');
                            }
                          }}
                        />
                        <Button
                          size="icon"
                          onClick={() => {
                            if (chatMessage.trim()) {
                              sendMessage(chatMessage);
                              setChatMessage('');
                            }
                          }}
                          disabled={!chatMessage.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Bouton média payant pour le créateur */}
                      {creatorId && (
                        <PaidMediaUpload
                          liveStreamId={currentStream.id}
                          creatorId={creatorId}
                          onMediaSent={(mediaData) => {
                            sendPaidMedia(mediaData);
                          }}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="moderation" className="mt-4">
                    <LiveModerationPanel
                      liveStreamId={currentStream.id}
                      isCreator={true}
                    />
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
