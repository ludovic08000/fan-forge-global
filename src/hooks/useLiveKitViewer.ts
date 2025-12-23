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
  
  const roomRef = useRef<any>(null);
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Obtenir un token LiveKit depuis l'edge function
   * Avec retry et refresh de session pour iOS
   */
  const getToken = useCallback(async (retryCount = 0): Promise<{ token: string; url: string }> => {
    if (!user?.id) {
      throw new Error('Authentification requise pour accéder au live');
    }

    console.log('[LiveKit Viewer] Getting token, retry:', retryCount);

    // Récupérer la session pour avoir le token d'authentification
    let { data: sessionData } = await supabase.auth.getSession();
    
    // Sur iOS, parfois la session est stale, on force un refresh
    if (!sessionData?.session?.access_token) {
      console.log('[LiveKit Viewer] No session, trying to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('[LiveKit Viewer] Refresh error:', refreshError);
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
          participantName: user.id,
          isPublisher: false,
          streamId: streamId,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('[LiveKit Viewer] Token error:', error);
        
        // Si erreur d'auth et pas encore retry, refresh et retry
        if (retryCount < 2 && (error.message?.includes('Auth') || error.message?.includes('session'))) {
          console.log('[LiveKit Viewer] Auth error, refreshing session and retrying...');
          await supabase.auth.refreshSession();
          return getToken(retryCount + 1);
        }
        
        throw new Error(error.message || 'Accès refusé - abonnement ou paiement requis');
      }
      
      return { token: data.token, url: data.url };
    } catch (err: any) {
      // Retry une fois sur erreur réseau (fréquent sur mobile)
      if (retryCount < 2 && (err?.message?.includes('network') || err?.message?.includes('fetch'))) {
        console.log('[LiveKit Viewer] Network error, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getToken(retryCount + 1);
      }
      throw err;
    }
  }, [streamId, user?.id]);

  /**
   * Se connecter au stream
   */
  const connect = useCallback(async () => {
    if (!streamId || isConnectingRef.current || isConnectedRef.current) return;

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
        
        if (track.kind === Track.Kind.Video) {
          // Utiliser la ref pour avoir toujours la valeur actuelle
          if (videoElementRef.current) {
            track.attach(videoElementRef.current);
            console.log('[LiveKit Viewer] Video attached to element');
          } else {
            console.warn('[LiveKit Viewer] Video element not available yet, retrying...');
            // Réessayer après un court délai
            setTimeout(() => {
              if (videoElementRef.current) {
                track.attach(videoElementRef.current);
                console.log('[LiveKit Viewer] Video attached after retry');
              }
            }, 100);
          }
        } else if (track.kind === Track.Kind.Audio) {
          const audio = track.attach();
          audio.volume = 1;
          document.body.appendChild(audio);
          audioElementRef.current = audio;
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
        isConnectedRef.current = true;
        setIsConnected(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('[LiveKit Viewer] Disconnected from room');
        isConnectedRef.current = false;
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
      isConnectedRef.current = false;
    }
  }, [streamId, getToken]);

  /**
   * Se déconnecter
   */
  const disconnect = useCallback(() => {
    console.log('[LiveKit Viewer] Disconnecting');
    
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.remove();
      audioElementRef.current = null;
    }

    isConnectedRef.current = false;
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  /**
   * Définir l'élément vidéo pour attacher le stream
   */
  const setVideoRef = useCallback((element: HTMLVideoElement | null) => {
    videoElementRef.current = element;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (audioElementRef.current) {
        audioElementRef.current.remove();
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    setVideoRef,
  };
};
