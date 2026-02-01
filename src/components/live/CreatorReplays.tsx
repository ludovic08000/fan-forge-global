/**
 * Composant pour afficher les replays du créateur
 * Optimisé pour affichage instantané avec thumbnails + préchargement batch
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ReplayCard } from './ReplayCard';
import { ReplayModal } from './ReplayModal';
import { useBatchSignedUrls } from '@/hooks/useBatchSignedUrls';

interface Replay {
  id: string;
  title: string;
  description: string | null;
  recording_url: string;
  thumbnail_url: string | null;
  ended_at: string;
  peak_viewer_count: number | null;
  is_premium: boolean;
}

export const CreatorReplays = () => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [selectedReplay, setSelectedReplay] = useState<Replay | null>(null);

  // Préparer les fichiers pour le batch signing
  const filesToSign = useMemo(() => 
    replays.map(r => ({
      id: r.id,
      url: r.recording_url,
      liveStreamId: r.id
    })),
    [replays]
  );

  // Hook pour obtenir toutes les URLs signées en batch
  const { getUrl, loading: urlsLoading } = useBatchSignedUrls(filesToSign);

  /**
   * Charger les replays du créateur
   */
  const loadReplays = useCallback(async () => {
    if (!user) return;

    try {
      // Récupérer l'ID du créateur
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creatorData) {
        setLoading(false);
        return;
      }

      setCreatorId(creatorData.id);

      const { data, error } = await supabase
        .from('live_streams')
        .select('id, title, description, recording_url, thumbnail_url, ended_at, peak_viewer_count, is_premium')
        .eq('creator_id', creatorData.id)
        .eq('status', 'ended')
        .not('recording_url', 'is', null)
        .order('ended_at', { ascending: false });

      if (error) throw error;
      setReplays(data || []);
    } catch (error) {
      console.error('Erreur chargement replays:', error);
      toast.error('Erreur lors du chargement des replays');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger les replays au montage
  useEffect(() => {
    loadReplays();
  }, [loadReplays]);

  // Subscription realtime pour rafraîchir automatiquement
  useEffect(() => {
    if (!creatorId) return;

    const channel = supabase
      .channel('creator-replays-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `creator_id=eq.${creatorId}`,
        },
        (payload) => {
          if (payload.new.recording_url && payload.new.status === 'ended') {
            console.log('[CreatorReplays] New replay available, refreshing...');
            loadReplays();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [creatorId, loadReplays]);

  /**
   * Supprimer un replay
   */
  const handleDeleteReplay = useCallback(async (replayId: string) => {
    if (!confirm('Supprimer ce replay ? Cette action est irréversible.')) return;

    try {
      const { error } = await supabase
        .from('live_streams')
        .update({ recording_url: null })
        .eq('id', replayId);

      if (error) throw error;
      
      setReplays(prev => prev.filter(r => r.id !== replayId));
      toast.success('Replay supprimé');
    } catch (error) {
      console.error('Erreur suppression replay:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  // URL signée pour le replay sélectionné
  const selectedReplayUrl = selectedReplay ? getUrl(selectedReplay.id) : null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Mes replays
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Mes replays
          {replays.length > 0 && (
            <Badge variant="secondary">{replays.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={loadReplays}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {replays.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun replay disponible</p>
            <p className="text-sm mt-1">
              Activez l'enregistrement lors de vos prochains lives
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {replays.map((replay) => (
              <ReplayCard
                key={replay.id}
                replay={replay}
                signedUrl={getUrl(replay.id)}
                onSelect={setSelectedReplay}
                onDelete={handleDeleteReplay}
              />
            ))}
          </div>
        )}

        {/* Modal lecture */}
        {selectedReplay && (
          <ReplayModal 
            replay={selectedReplay}
            signedUrl={selectedReplayUrl}
            loading={urlsLoading && !selectedReplayUrl}
            onClose={() => setSelectedReplay(null)} 
          />
        )}
      </CardContent>
    </Card>
  );
};

export default CreatorReplays;
