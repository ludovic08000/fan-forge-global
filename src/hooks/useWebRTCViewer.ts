/**
 * Hook WebRTC pour recevoir le stream en tant que viewer
 * Se connecte au créateur via Supabase Realtime signaling
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTCViewer = (streamId: string) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const viewerIdRef = useRef<string>(crypto.randomUUID());
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);

  /**
   * Se connecter au stream du créateur
   */
  const connect = useCallback(async () => {
    if (!streamId || isConnectingRef.current || isConnectedRef.current) return;

    console.log('[Viewer] Connecting to stream:', streamId);
    isConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      // Créer la connexion peer
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Configurer pour recevoir les tracks
      pc.ontrack = (event) => {
        console.log('[Viewer] Received track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          isConnectedRef.current = true;
          isConnectingRef.current = false;
          setIsConnected(true);
          setIsConnecting(false);
        }
      };

      // Gérer les candidats ICE
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[Viewer] Sending ICE candidate to broadcaster');
          channelRef.current?.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              candidate: event.candidate.toJSON(),
              viewerId: viewerIdRef.current,
              fromBroadcaster: false,
            },
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[Viewer] ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setError('Connexion perdue avec le créateur');
          isConnectedRef.current = false;
          setIsConnected(false);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[Viewer] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          isConnectedRef.current = true;
          isConnectingRef.current = false;
          setIsConnected(true);
          setIsConnecting(false);
        } else if (pc.connectionState === 'failed') {
          setError('Impossible de se connecter au stream');
          isConnectingRef.current = false;
          setIsConnecting(false);
        }
      };

      // Créer le canal de signalisation
      const channel = supabase.channel(`live-stream-${streamId}`, {
        config: {
          broadcast: { self: false },
        },
      });

      channel
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.targetId === viewerIdRef.current && payload.answer) {
            console.log('[Viewer] Received answer from broadcaster');
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            } catch (error) {
              console.error('[Viewer] Error setting remote description:', error);
            }
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.fromBroadcaster && payload.targetId === viewerIdRef.current && payload.candidate) {
            console.log('[Viewer] Received ICE candidate from broadcaster');
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (error) {
              console.error('[Viewer] Error adding ICE candidate:', error);
            }
          }
        })
        .on('broadcast', { event: 'stream-ended' }, () => {
          console.log('[Viewer] Stream ended by broadcaster');
          setError('Le live est terminé');
          disconnect();
        })
        .subscribe(async (status) => {
          console.log('[Viewer] Channel status:', status);
          if (status === 'SUBSCRIBED') {
            // Ajouter transceivers pour recevoir audio/vidéo
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            // Créer l'offre
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Envoyer l'offre au broadcaster
            channel.send({
              type: 'broadcast',
              event: 'viewer-join',
              payload: {
                viewerId: viewerIdRef.current,
                offer: pc.localDescription?.toJSON(),
              },
            });

            console.log('[Viewer] Sent offer to broadcaster');
          }
        });

      channelRef.current = channel;

      // Timeout si pas de connexion après 15 secondes
      setTimeout(() => {
        if (!isConnectedRef.current && isConnectingRef.current) {
          setError('Le créateur n\'est pas en direct ou le stream n\'est pas disponible');
          isConnectingRef.current = false;
          setIsConnecting(false);
        }
      }, 15000);

    } catch (error) {
      console.error('[Viewer] Connection error:', error);
      setError('Erreur de connexion au stream');
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }, [streamId]);

  /**
   * Se déconnecter du stream
   */
  const disconnect = useCallback(() => {
    // Skip if already disconnected
    if (!channelRef.current && !peerConnectionRef.current) return;
    
    console.log('[Viewer] Disconnecting');

    // Notifier le broadcaster
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'viewer-leave',
        payload: { viewerId: viewerIdRef.current },
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Fermer la connexion peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setRemoteStream(null);
    isConnectedRef.current = false;
    isConnectingRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    remoteStream,
    error,
    connect,
    disconnect,
  };
};
