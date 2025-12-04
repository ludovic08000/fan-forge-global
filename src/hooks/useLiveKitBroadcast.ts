/**
 * Hook LiveKit pour diffuser le stream du créateur
 * Utilise LiveKit pour une diffusion fiable
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Room, RoomEvent, LocalParticipant, Track, createLocalTracks } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LIVEKIT_URL = 'wss://plaisir-ykn9lxey.livekit.cloud';

export const useLiveKitBroadcast = (streamId: string) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const roomRef = useRef<Room | null>(null);

  /**
   * Obtenir un token LiveKit depuis l'edge function
   */
  const getToken = useCallback(async (isPublisher: boolean) => {
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: {
        roomName: `live-${streamId}`,
        participantName: `broadcaster-${streamId}`,
        isPublisher,
      },
    });

    if (error) throw error;
    return data.token;
  }, [streamId]);

  /**
   * Démarrer la diffusion LiveKit
   */
  const startBroadcast = useCallback(async (mediaStream?: MediaStream | null) => {
    if (!streamId || isConnecting || isStreaming) return;

    console.log('[LiveKit Broadcast] Starting broadcast for stream:', streamId);
    setIsConnecting(true);
    setError(null);

    try {
      // Obtenir le token
      const token = await getToken(true);
      console.log('[LiveKit Broadcast] Token obtained');

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
      await room.connect(LIVEKIT_URL, token);
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
          // Continuer sans média (mode test)
        }
      }

      setIsStreaming(true);
      setIsConnecting(false);
      setConnectedViewers(room.remoteParticipants.size);
      
      toast.success('Diffusion LiveKit démarrée!');

    } catch (error) {
      console.error('[LiveKit Broadcast] Error:', error);
      setError('Erreur de connexion LiveKit');
      setIsConnecting(false);
      toast.error('Erreur de connexion LiveKit');
    }
  }, [streamId, isConnecting, isStreaming, getToken]);

  /**
   * Arrêter la diffusion
   */
  const stopBroadcast = useCallback(async () => {
    console.log('[LiveKit Broadcast] Stopping broadcast');
    
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

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
