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

export const useLiveKitBroadcast = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const roomRef = useRef<any>(null);
  const currentStreamIdRef = useRef<string | null>(null);

  /**
   * Obtenir un token LiveKit depuis l'edge function
   */
  const getToken = useCallback(async (streamId: string, isPublisher: boolean) => {
    console.log('[LiveKit Broadcast] Getting token for stream:', streamId);
    
    // Récupérer la session pour avoir le token d'authentification
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.access_token) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    
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
      throw error;
    }
    console.log('[LiveKit Broadcast] Token received, URL:', data.url);
    return { token: data.token, url: data.url };
  }, []);

  /**
   * Démarrer la diffusion LiveKit
   */
  const startBroadcast = useCallback(async (streamId: string, mediaStream?: MediaStream | null) => {
    if (!streamId) {
      console.error('[LiveKit Broadcast] No streamId provided');
      toast.error('ID du stream manquant');
      return;
    }

    if (isConnecting || isStreaming) {
      console.log('[LiveKit Broadcast] Already connecting or streaming');
      return;
    }

    console.log('[LiveKit Broadcast] Starting broadcast for stream:', streamId);
    currentStreamIdRef.current = streamId;
    setIsConnecting(true);
    setError(null);

    try {
      // Charger le module LiveKit de manière lazy
      const liveKit = await loadLiveKitModule();
      const { Room, RoomEvent, createLocalTracks } = liveKit;
      
      // Obtenir le token et l'URL
      const { token, url: livekitUrl } = await getToken(streamId, true);
      console.log('[LiveKit Broadcast] Token obtained, connecting to room at:', livekitUrl);


      // Créer et connecter la room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
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
      
      toast.success('Diffusion LiveKit démarrée!');

    } catch (err: any) {
      console.error('[LiveKit Broadcast] Error:', err);
      setError(err?.message || 'Erreur de connexion LiveKit');
      setIsConnecting(false);
      toast.error(err?.message || 'Erreur de connexion LiveKit');
    }
  }, [isConnecting, isStreaming, getToken]);

  /**
   * Arrêter la diffusion
   */
  const stopBroadcast = useCallback(async () => {
    console.log('[LiveKit Broadcast] Stopping broadcast');
    
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    currentStreamIdRef.current = null;
    setIsStreaming(false);
    setConnectedViewers(0);
  }, []);

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
    connectedViewers,
    error,
    startBroadcast,
    stopBroadcast,
  };
};
