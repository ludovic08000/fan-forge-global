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
  const [loading, setLoading] = useState(false);

  /**
   * Récupérer les lives en cours (utilise la vue publique pour que tous les utilisateurs voient les lives)
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
      setLiveStreams((data || []) as LiveStream[]);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur chargement lives:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

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
   * Écouter les changements en temps réel sur les lives
   * Détecte automatiquement les lives terminés pour les retirer de la liste
   */
  useEffect(() => {
    const channel = supabase
      .channel('live_streams_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        (payload) => {
          console.log('Live stream changed:', payload);
          
          // Si c'est une mise à jour, vérifier si le live est terminé
          if (payload.eventType === 'UPDATE') {
            const updatedStream = payload.new as LiveStream;
            
            // Si le status est passé à 'ended' ou 'cancelled', le retirer immédiatement de la liste
            if (updatedStream.status === 'ended' || updatedStream.status === 'cancelled') {
              console.log('Live stream ended/cancelled, removing from list:', updatedStream.id);
              setLiveStreams(prev => prev.filter(s => s.id !== updatedStream.id));
              return;
            }
            
            // Sinon, mettre à jour le stream dans la liste
            setLiveStreams(prev => prev.map(s => 
              s.id === updatedStream.id ? { ...s, ...updatedStream } : s
            ));
          } else if (payload.eventType === 'INSERT') {
            // Nouveau live, ajouter à la liste s'il est live ou scheduled
            const newStream = payload.new as LiveStream;
            if (newStream.status === 'live' || newStream.status === 'scheduled') {
              setLiveStreams(prev => {
                // Éviter les doublons
                if (prev.some(s => s.id === newStream.id)) return prev;
                return [newStream, ...prev];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            // Live supprimé
            const deletedId = (payload.old as any).id;
            setLiveStreams(prev => prev.filter(s => s.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    liveStreams,
    loading,
    fetchLiveStreams,
    createLiveStream,
    startLiveStream,
    endLiveStream,
    joinLiveStream,
    leaveLiveStream,
  };
};
