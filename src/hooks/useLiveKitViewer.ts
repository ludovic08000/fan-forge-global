/**
 * Hook LiveKit pour recevoir le stream en tant que viewer
 * Utilise LiveKit pour une réception fiable
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// L'URL LiveKit sera récupérée dynamiquement depuis l'edge function

// Cache du module LiveKit
let liveKitModule: typeof import('livekit-client') | null = null;
let liveKitLoadPromise: Promise<typeof import('livekit-client')> | null = null;

/**
 * Charger le module LiveKit de manière lazy
 */
const loadLiveKit = async () => {
  if (liveKitModule) return liveKitModule;
  
  if (!liveKitLoadPromise) {
    liveKitLoadPromise = import('livekit-client')
      .then(module => {
        liveKitModule = module;
        console.log('[LiveKit Viewer] Module loaded successfully');
        return module;
      })
      .catch(err => {
        console.error('[LiveKit Viewer] Failed to load module:', err);
        liveKitLoadPromise = null;
        throw new Error('LiveKit non disponible dans cet environnement');
      });
  }
  
  return liveKitLoadPromise;
};

export const useLiveKitViewer = (streamId: string) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const roomRef = useRef<any>(null);
  const isConnectingRef = useRef(false);

  /**
   * Obtenir un token LiveKit depuis l'edge function
   */
  const getToken = useCallback(async () => {
    const viewerId = user?.id || `viewer-${crypto.randomUUID()}`;
    
    const { data, error } = await supabase.functions.invoke('livekit-token', {
      body: {
        roomName: `live-${streamId}`,
        participantName: viewerId,
        isPublisher: false,
      },
    });

    if (error) throw error;
    return { token: data.token, url: data.url };
  }, [streamId, user?.id]);

  /**
   * Se connecter au stream
   */
  const connect = useCallback(async () => {
    if (!streamId || isConnectingRef.current || isConnected) return;

    console.log('[LiveKit Viewer] Connecting to stream:', streamId);
    isConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // Charger LiveKit de manière lazy
      const liveKit = await loadLiveKit();
      const { Room, RoomEvent, Track } = liveKit;

      // Obtenir le token et l'URL
      const { token, url: livekitUrl } = await getToken();
      console.log('[LiveKit Viewer] Token obtained, URL:', livekitUrl);

      // Créer la room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Handler pour attacher les tracks
      const handleTrackSubscribed = (
        track: any,
        publication: any,
        participant: any
      ) => {
        console.log('[LiveKit Viewer] Track subscribed:', track.kind, 'from', participant.identity);
        
        if (track.kind === Track.Kind.Video && videoElement) {
          track.attach(videoElement);
          console.log('[LiveKit Viewer] Video attached');
        } else if (track.kind === Track.Kind.Audio) {
          const audio = track.attach();
          audio.volume = 1;
          document.body.appendChild(audio);
          setAudioElement(audio);
          console.log('[LiveKit Viewer] Audio attached');
        }
      };

      // Handler pour détacher les tracks
      const handleTrackUnsubscribed = (track: any) => {
        console.log('[LiveKit Viewer] Track unsubscribed:', track.kind);
        track.detach();
      };

      // Écouter les événements
      room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

      room.on(RoomEvent.Connected, () => {
        console.log('[LiveKit Viewer] Connected to room');
        setIsConnected(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('[LiveKit Viewer] Disconnected from room');
        setIsConnected(false);
        isConnectingRef.current = false;
      });

      room.on(RoomEvent.ParticipantConnected, (participant: any) => {
        console.log('[LiveKit Viewer] Participant connected:', participant.identity);
      });

      // Connecter
      await room.connect(livekitUrl, token);
      roomRef.current = room;

      // Vérifier si le broadcaster est déjà présent
      room.remoteParticipants.forEach((participant: any) => {
        participant.trackPublications.forEach((publication: any) => {
          if (publication.track && publication.isSubscribed) {
            handleTrackSubscribed(
              publication.track,
              publication,
              participant
            );
          }
        });
      });

    } catch (err: any) {
      console.error('[LiveKit Viewer] Connection error:', err);
      setError(err?.message || 'Erreur de connexion au stream');
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }, [streamId, isConnected, getToken, videoElement]);

  /**
   * Se déconnecter
   */
  const disconnect = useCallback(() => {
    console.log('[LiveKit Viewer] Disconnecting');
    
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (audioElement) {
      audioElement.remove();
      setAudioElement(null);
    }

    setIsConnected(false);
    isConnectingRef.current = false;
  }, [audioElement]);

  /**
   * Définir l'élément vidéo pour attacher le stream
   */
  const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
    setVideoElement(element);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (audioElement) {
        audioElement.remove();
      }
    };
  }, [audioElement]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    setVideoRef,
  };
};
