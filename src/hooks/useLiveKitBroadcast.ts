/**
 * Hook LiveKit pour diffuser le stream du créateur
 * Utilise LiveKit pour une diffusion fiable
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// L'URL LiveKit sera récupérée dynamiquement depuis l'edge function

// Cache pour le module LiveKit
let liveKitModule: typeof import('livekit-client') | null = null;
let liveKitLoadPromise: Promise<typeof import('livekit-client')> | null = null;

/**
 * Charger le module LiveKit de manière lazy
 */
const loadLiveKitModule = async () => {
  if (liveKitModule) return liveKitModule;
  
  if (!liveKitLoadPromise) {
    liveKitLoadPromise = import('livekit-client')
      .then(module => {
        liveKitModule = module;
        console.log('[LiveKit Broadcast] Module loaded successfully');
        return module;
      })
      .catch(err => {
        console.error('[LiveKit Broadcast] Failed to load module:', err);
        liveKitLoadPromise = null;
        throw new Error('LiveKit non disponible dans cet environnement');
      });
  }
  
  return liveKitLoadPromise;
};

// Détecter Safari iOS
const isSafariIOS = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua);
  return iOS && webkit && notChrome;
};

export const useLiveKitBroadcast = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const roomRef = useRef<any>(null);
  const currentStreamIdRef = useRef<string | null>(null);
  const recordingEnabledRef = useRef<boolean>(false);

  /**
   * Obtenir un token LiveKit depuis l'edge function
   * Avec retry et refresh de session pour iOS
   */
  const getToken = useCallback(async (streamId: string, isPublisher: boolean, retryCount = 0): Promise<{ token: string; url: string }> => {
    console.log('[LiveKit Broadcast] Getting token for stream:', streamId, 'retry:', retryCount);
    
    // Récupérer la session pour avoir le token d'authentification
    let { data: sessionData } = await supabase.auth.getSession();
    
    // Sur iOS, parfois la session est stale, on force un refresh
    if (!sessionData?.session?.access_token) {
      console.log('[LiveKit Broadcast] No session, trying to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[LiveKit Broadcast] Refresh error:', refreshError);
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
      sessionData = refreshData;
    }
    
    if (!sessionData?.session?.access_token) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName: `live-${streamId}`,
          participantName: `broadcaster-${streamId}`,
          isPublisher,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('[LiveKit Broadcast] Token error:', error);
        
        // Si erreur d'auth et pas encore retry, refresh et retry
        if (retryCount < 2 && (error.message?.includes('Auth') || error.message?.includes('session'))) {
          console.log('[LiveKit Broadcast] Auth error, refreshing session and retrying...');
          await supabase.auth.refreshSession();
          return getToken(streamId, isPublisher, retryCount + 1);
        }
        
        throw error;
      }
      
      console.log('[LiveKit Broadcast] Token received, URL:', data.url);
      return { token: data.token, url: data.url };
    } catch (err: any) {
      // Retry une fois sur erreur réseau (fréquent sur mobile)
      if (retryCount < 2 && (err?.message?.includes('network') || err?.message?.includes('fetch'))) {
        console.log('[LiveKit Broadcast] Network error, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getToken(streamId, isPublisher, retryCount + 1);
      }
      throw err;
    }
  }, []);

  /**
   * Démarrer l'enregistrement LiveKit via l'edge function
   */
  const startRecording = useCallback(async (streamId: string) => {
    try {
      console.log('[LiveKit Broadcast] Starting recording for stream:', streamId);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Session expirée');
      }
      
      const { data, error } = await supabase.functions.invoke('start-live-recording', {
        body: { streamId },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('[LiveKit Broadcast] Recording start error:', error);
        toast.error('Impossible de démarrer l\'enregistrement');
        return false;
      }

      console.log('[LiveKit Broadcast] Recording started:', data);
      setIsRecording(true);
      toast.success('Enregistrement démarré');
      return true;
    } catch (err: any) {
      console.error('[LiveKit Broadcast] Recording error:', err);
      toast.error(err?.message || 'Erreur d\'enregistrement');
      return false;
    }
  }, []);

  /**
   * Arrêter l'enregistrement LiveKit
   */
  const stopRecording = useCallback(async (streamId: string) => {
    try {
      console.log('[LiveKit Broadcast] Stopping recording for stream:', streamId);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) return;
      
      const { error } = await supabase.functions.invoke('stop-live-recording', {
        body: { streamId },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('[LiveKit Broadcast] Recording stop error:', error);
      } else {
        console.log('[LiveKit Broadcast] Recording stopped successfully');
        toast.success('Enregistrement terminé - le replay sera disponible dans quelques instants');
      }
      
      setIsRecording(false);
    } catch (err) {
      console.error('[LiveKit Broadcast] Stop recording error:', err);
    }
  }, []);

  /**
   * Démarrer la diffusion LiveKit
   */
  const startBroadcast = useCallback(async (streamId: string, mediaStream?: MediaStream | null, enableRecording?: boolean) => {
    if (!streamId) {
      console.error('[LiveKit Broadcast] No streamId provided');
      toast.error('ID du stream manquant');
      return;
    }

    if (isConnecting || isStreaming) {
      console.log('[LiveKit Broadcast] Already connecting or streaming');
      return;
    }

    console.log('[LiveKit Broadcast] Starting broadcast for stream:', streamId, 'recording:', enableRecording);
    currentStreamIdRef.current = streamId;
    recordingEnabledRef.current = enableRecording || false;
    setIsConnecting(true);
    setError(null);

    try {
      // Charger le module LiveKit de manière lazy
      const liveKit = await loadLiveKitModule();
      const { Room, RoomEvent, createLocalTracks } = liveKit;
      
      // Obtenir le token et l'URL
      const { token, url: livekitUrl } = await getToken(streamId, true);
      console.log('[LiveKit Broadcast] Token obtained, connecting to room at:', livekitUrl);


      // Créer et connecter la room avec options Safari
      const room = new Room({
        adaptiveStream: true,
        dynacast: !isSafariIOS(), // Désactiver dynacast sur Safari iOS
        publishDefaults: {
          simulcast: !isSafariIOS(), // Désactiver simulcast sur Safari iOS
        },
      });

      // Écouter les événements
      room.on(RoomEvent.ParticipantConnected, () => {
        setConnectedViewers(room.remoteParticipants.size);
        console.log('[LiveKit Broadcast] Participant connected, total:', room.remoteParticipants.size);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setConnectedViewers(room.remoteParticipants.size);
        console.log('[LiveKit Broadcast] Participant disconnected, total:', room.remoteParticipants.size);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('[LiveKit Broadcast] Disconnected from room');
        setIsStreaming(false);
        setIsConnecting(false);
      });

      // Connecter à la room
      await room.connect(livekitUrl, token);
      console.log('[LiveKit Broadcast] Connected to room');

      roomRef.current = room;

      // Publier les tracks
      if (mediaStream) {
        // Utiliser le stream existant
        const videoTrack = mediaStream.getVideoTracks()[0];
        const audioTrack = mediaStream.getAudioTracks()[0];

        if (videoTrack) {
          await room.localParticipant.publishTrack(videoTrack, {
            name: 'camera',
            simulcast: true,
          });
          console.log('[LiveKit Broadcast] Video track published');
        }

        if (audioTrack) {
          await room.localParticipant.publishTrack(audioTrack, {
            name: 'microphone',
          });
          console.log('[LiveKit Broadcast] Audio track published');
        }
      } else {
        // Créer de nouveaux tracks
        console.log('[LiveKit Broadcast] Creating local tracks...');
        try {
          const tracks = await createLocalTracks({
            audio: true,
            video: true,
          });

          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            console.log('[LiveKit Broadcast] Track published:', track.kind);
          }
        } catch (trackError) {
          console.warn('[LiveKit Broadcast] Could not create local tracks:', trackError);
        }
      }

      setIsStreaming(true);
      setIsConnecting(false);
      setConnectedViewers(room.remoteParticipants.size);
      
      toast.success('Diffusion démarrée!');

      // Démarrer l'enregistrement automatiquement si activé
      if (recordingEnabledRef.current) {
        console.log('[LiveKit Broadcast] Auto-starting recording...');
        // Petit délai pour s'assurer que le stream est bien établi
        setTimeout(() => {
          startRecording(streamId);
        }, 2000);
      }

    } catch (err: any) {
      console.error('[LiveKit Broadcast] Error:', err);
      setError(err?.message || 'Erreur de connexion');
      setIsConnecting(false);
      toast.error(err?.message || 'Erreur de connexion');
    }
  }, [isConnecting, isStreaming, getToken, startRecording]);

  /**
   * Remplacer le track vidéo sans déconnecter (pour switch caméra)
   */
  const replaceVideoTrack = useCallback(async (newVideoTrack: MediaStreamTrack) => {
    if (!roomRef.current) {
      console.warn('[LiveKit Broadcast] No room to replace track');
      return false;
    }

    try {
      console.log('[LiveKit Broadcast] Replacing video track...');
      const localParticipant = roomRef.current.localParticipant;
      
      // Trouver la publication vidéo existante
      const publications = Array.from(localParticipant.trackPublications.values()) as any[];
      const videoPublication = publications.find((pub) => pub.track?.kind === 'video');
      
      if (videoPublication?.track) {
        // Unpublish l'ancien track
        await localParticipant.unpublishTrack(videoPublication.track);
        console.log('[LiveKit Broadcast] Old video track unpublished');
      }
      
      // Publier le nouveau track
      await localParticipant.publishTrack(newVideoTrack, {
        name: 'camera',
        simulcast: false, // Désactiver simulcast pour le switch caméra mobile
      });
      console.log('[LiveKit Broadcast] New video track published');
      
      return true;
    } catch (err) {
      console.error('[LiveKit Broadcast] Error replacing video track:', err);
      return false;
    }
  }, []);

  /**
   * Arrêter la diffusion
   */
  const stopBroadcast = useCallback(async () => {
    console.log('[LiveKit Broadcast] Stopping broadcast');
    
    // Arrêter l'enregistrement si actif
    if (isRecording && currentStreamIdRef.current) {
      await stopRecording(currentStreamIdRef.current);
    }
    
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    currentStreamIdRef.current = null;
    recordingEnabledRef.current = false;
    setIsStreaming(false);
    setIsRecording(false);
    setConnectedViewers(0);
  }, [isRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    isStreaming,
    isConnecting,
    isRecording,
    connectedViewers,
    error,
    startBroadcast,
    stopBroadcast,
    startRecording,
    stopRecording,
    replaceVideoTrack,
  };
};
