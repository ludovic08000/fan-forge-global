/**
 * Hook pour gérer les live streams
 * Gère la création, le démarrage, l'arrêt et la visualisation des lives
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface LiveStream {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  is_premium: boolean;
  price: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  scheduled_at: string;
  started_at: string;
  ended_at: string;
  viewer_count: number;
  peak_viewer_count: number;
  thumbnail_url: string;
  recording_url: string;
  stream_key: string;
  enable_recording: boolean;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook personnalisé pour gérer les live streams
 */
export const useLiveStream = () => {
  const { user } = useAuth();
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);


  /**
   * Filtrer les lives fantômes côté client (avant que le cleanup serveur ne passe)
   */
  const filterGhostLives = (streams: any[]): LiveStream[] => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    return streams.filter((stream: any) => {
      // Garder tous les lives non "live"
      if (stream.status !== 'live') return true;
      
      // Exclure les lives sans started_at
      if (!stream.started_at) return false;
      
      // Exclure les lives dont le heartbeat est trop vieux
      if (stream.last_heartbeat) {
        const lastHeartbeat = new Date(stream.last_heartbeat);
        if (lastHeartbeat < twoMinutesAgo) {
          console.log(`[useLiveStream] Filtering ghost live: ${stream.id} (heartbeat: ${stream.last_heartbeat})`);
          return false;
        }
      }
      
      return true;
    }) as LiveStream[];
  };

  /**
   * Récupérer les lives en cours (utilise la vue publique pour que tous les utilisateurs voient les lives)
   * Filtre les lives fantômes automatiquement
   */
  const fetchLiveStreams = async (status?: string) => {
    try {
      setLoading(true);
      
      // Utiliser la vue publique pour récupérer tous les lives visibles
      let query = supabase
        .from('public_live_streams')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      } else {
        // Par défaut, exclure les lives terminés et annulés
        query = query.in('status', ['live', 'scheduled']);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filtrer les lives fantômes côté client immédiatement
      const filteredData = filterGhostLives(data || []);
      
      setLiveStreams(filteredData);
      return { data: filteredData, error: null };
    } catch (error) {
      console.error('Erreur chargement lives:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charger automatiquement les lives au montage et écouter les changements temps réel
   * NOTE: On écoute la table live_streams mais on recharge via la vue publique
   * pour garantir l'accès aux données même sans authentification
   */
  useEffect(() => {
    // Charger les lives immédiatement
    fetchLiveStreams();

    // Écouter les changements en temps réel sur la table live_streams
    // Quand un événement arrive, on recharge la liste complète via la vue publique
    const channel = supabase
      .channel('useLiveStream-realtime-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        (payload) => {
          console.log('[useLiveStream] Realtime event received:', payload.eventType);
          
          // Recharger la liste complète via la vue publique pour garantir les données
          fetchLiveStreams();
        }
      )
      .subscribe((status) => {
        console.log('[useLiveStream] Subscription status:', status);
      });

    return () => {
      console.log('[useLiveStream] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Créer un nouveau live stream
   */
  const createLiveStream = async (streamData: {
    title: string;
    description?: string;
    is_premium?: boolean;
    price?: number;
    scheduled_at?: string;
    enable_recording?: boolean;
  }) => {
    try {
      // Récupérer l'ID du créateur
      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (creatorError) throw creatorError;

      // Générer une clé de stream
      const { data: streamKey } = await supabase
        .rpc('generate_stream_key');

      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          creator_id: creatorData.id,
          title: streamData.title,
          description: streamData.description,
          is_premium: streamData.is_premium || false,
          price: streamData.price || 0,
          scheduled_at: streamData.scheduled_at,
          stream_key: streamKey,
          status: 'scheduled',
          enable_recording: streamData.enable_recording || false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Live créé avec succès!');
      return { data, error: null };
    } catch (error) {
      console.error('Erreur création live:', error);
      toast.error('Erreur lors de la création du live');
      return { data: null, error };
    }
  };

  /**
   * Démarrer un live stream
   */
  const startLiveStream = async (streamId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .update({
          status: 'live',
          started_at: new Date().toISOString(),
        })
        .eq('id', streamId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Live démarré!');
      return { data, error: null };
    } catch (error) {
      console.error('Erreur démarrage live:', error);
      toast.error('Erreur lors du démarrage du live');
      return { data: null, error };
    }
  };

  /**
   * Arrêter un live stream
   */
  const endLiveStream = async (streamId: string) => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', streamId)
        .select()
        .single();

      if (error) throw error;

      toast.success('Live terminé');
      return { data, error: null };
    } catch (error) {
      console.error('Erreur arrêt live:', error);
      toast.error('Erreur lors de l\'arrêt du live');
      return { data: null, error };
    }
  };

  /**
   * Rejoindre un live stream comme spectateur
   */
  const joinLiveStream = async (streamId: string) => {
    try {
      const { error } = await supabase
        .from('live_stream_viewers')
        .insert({
          live_stream_id: streamId,
          user_id: user?.id,
        });

      if (error && !error.message.includes('duplicate')) throw error;

      // Incrémenter le compteur de spectateurs
      const { data: currentStream } = await supabase
        .from('live_streams')
        .select('viewer_count')
        .eq('id', streamId)
        .single();

      await supabase
        .from('live_streams')
        .update({ viewer_count: (currentStream?.viewer_count || 0) + 1 })
        .eq('id', streamId);

      return { error: null };
    } catch (error) {
      console.error('Erreur rejoindre live:', error);
      return { error };
    }
  };

  /**
   * Quitter un live stream
   */
  const leaveLiveStream = async (streamId: string) => {
    try {
      const { error } = await supabase
        .from('live_stream_viewers')
        .update({ left_at: new Date().toISOString() })
        .eq('live_stream_id', streamId)
        .eq('user_id', user?.id);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Erreur quitter live:', error);
      return { error };
    }
  };

  /**
   * Récupérer les replays du créateur (lives terminés avec recording_url)
   */
  const fetchMyReplays = async () => {
    if (!user) return { data: null, error: 'Not authenticated' };
    
    try {
      // Récupérer l'ID du créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorData) return { data: [], error: null };

      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('creator_id', creatorData.id)
        .eq('status', 'ended')
        .not('recording_url', 'is', null)
        .order('ended_at', { ascending: false });

      if (error) throw error;
      return { data: data as LiveStream[], error: null };
    } catch (error) {
      console.error('Erreur chargement replays:', error);
      return { data: null, error };
    }
  };

  return {
    liveStreams,
    loading,
    fetchLiveStreams,
    fetchMyReplays,
    createLiveStream,
    startLiveStream,
    endLiveStream,
    joinLiveStream,
    leaveLiveStream,
  };
};
