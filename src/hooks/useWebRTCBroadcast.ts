/**
 * Hook WebRTC pour diffuser le stream du créateur vers les viewers
 * Utilise Supabase Realtime pour la signalisation
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  viewerId: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTCBroadcast = (streamId: string) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectedViewers, setConnectedViewers] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * Créer une connexion peer pour un nouveau viewer
   */
  const createPeerConnection = useCallback(async (viewerId: string): Promise<RTCPeerConnection> => {
    console.log('[Broadcast] Creating peer connection for viewer:', viewerId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Ajouter les tracks locaux
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[Broadcast] Adding track:', track.kind);
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Gérer les candidats ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[Broadcast] Sending ICE candidate to viewer:', viewerId);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            targetId: viewerId,
            fromBroadcaster: true,
          },
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[Broadcast] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        removePeer(viewerId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[Broadcast] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectedViewers(prev => prev + 1);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectedViewers(prev => Math.max(0, prev - 1));
      }
    };

    peersRef.current.set(viewerId, { id: viewerId, connection: pc, viewerId });
    
    return pc;
  }, []);

  /**
   * Supprimer un peer
   */
  const removePeer = useCallback((viewerId: string) => {
    const peer = peersRef.current.get(viewerId);
    if (peer) {
      console.log('[Broadcast] Removing peer:', viewerId);
      peer.connection.close();
      peersRef.current.delete(viewerId);
      setConnectedViewers(prev => Math.max(0, prev - 1));
    }
  }, []);

  /**
   * Gérer une demande de connexion d'un viewer
   */
  const handleViewerJoin = useCallback(async (viewerId: string, offer: RTCSessionDescriptionInit) => {
    console.log('[Broadcast] Viewer joining:', viewerId);
    
    try {
      const pc = await createPeerConnection(viewerId);
      
      // Définir l'offre distante
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Créer et envoyer la réponse
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      channelRef.current?.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          answer: pc.localDescription?.toJSON(),
          targetId: viewerId,
        },
      });
      
      console.log('[Broadcast] Answer sent to viewer:', viewerId);
    } catch (error) {
      console.error('[Broadcast] Error handling viewer join:', error);
      removePeer(viewerId);
    }
  }, [createPeerConnection, removePeer]);

  /**
   * Gérer un candidat ICE d'un viewer
   */
  const handleIceCandidate = useCallback(async (viewerId: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(viewerId);
    if (peer && candidate) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[Broadcast] Added ICE candidate from viewer:', viewerId);
      } catch (error) {
        console.error('[Broadcast] Error adding ICE candidate:', error);
      }
    }
  }, []);

  /**
   * Démarrer la diffusion
   */
  const startBroadcast = useCallback(async (stream: MediaStream) => {
    if (!streamId) {
      toast.error('ID du stream manquant');
      return;
    }

    console.log('[Broadcast] Starting broadcast for stream:', streamId);
    localStreamRef.current = stream;

    // Créer le canal de signalisation
    const channel = supabase.channel(`live-stream-${streamId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
        console.log('[Broadcast] Received viewer-join:', payload);
        if (payload.offer && payload.viewerId) {
          await handleViewerJoin(payload.viewerId, payload.offer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (!payload.fromBroadcaster && payload.viewerId && payload.candidate) {
          await handleIceCandidate(payload.viewerId, payload.candidate);
        }
      })
      .on('broadcast', { event: 'viewer-leave' }, ({ payload }) => {
        if (payload.viewerId) {
          removePeer(payload.viewerId);
        }
      })
      .subscribe((status) => {
        console.log('[Broadcast] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsStreaming(true);
          // Annoncer que le stream est disponible
          channel.send({
            type: 'broadcast',
            event: 'stream-ready',
            payload: { streamId },
          });
        }
      });

    channelRef.current = channel;
  }, [streamId, handleViewerJoin, handleIceCandidate, removePeer]);

  /**
   * Arrêter la diffusion
   */
  const stopBroadcast = useCallback(() => {
    console.log('[Broadcast] Stopping broadcast');
    
    // Fermer toutes les connexions peer
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();

    // Fermer le canal
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'stream-ended',
        payload: { streamId },
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    localStreamRef.current = null;
    setIsStreaming(false);
    setConnectedViewers(0);
  }, [streamId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBroadcast();
    };
  }, [stopBroadcast]);

  return {
    isStreaming,
    connectedViewers,
    startBroadcast,
    stopBroadcast,
  };
};
