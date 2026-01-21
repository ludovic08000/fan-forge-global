/**
 * Composant pour afficher les replays du créateur
 * Se rafraîchit automatiquement quand un nouveau replay est disponible
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Eye, Clock, Play, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import SecureVideoPreviewCard from '@/components/SecureVideoPreviewCard';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';

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

  /**
   * Charger les replays du créateur
   */
  const loadReplays = async () => {
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
  };

  // Charger les replays au montage
  useEffect(() => {
    loadReplays();
  }, [user]);

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
          // Si le recording_url vient d'être ajouté, rafraîchir
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
  }, [creatorId]);

  /**
   * Supprimer un replay
   */
  const handleDeleteReplay = async (replayId: string) => {
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
  };

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
              <div 
                key={replay.id}
                className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedReplay(replay)}
              >
                {/* Preview vidéo */}
                <div className="aspect-video relative">
                  <SecureVideoPreviewCard
                    src={replay.recording_url}
                    liveStreamId={replay.id}
                    poster={replay.thumbnail_url}
                    isPremium={replay.is_premium}
                    className="w-full h-full"
                  />
                  
                  {/* Overlay play */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 rounded-full p-3">
                      <Play className="h-6 w-6 text-black fill-black" />
                    </div>
                  </div>
                  
                  {/* Badge premium */}
                  {replay.is_premium && (
                    <Badge className="absolute top-2 left-2 bg-amber-500">
                      Premium
                    </Badge>
                  )}
                </div>

                {/* Infos */}
                <div className="p-3 space-y-1">
                  <h4 className="font-medium truncate">{replay.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {replay.peak_viewer_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(replay.ended_at), { 
                        addSuffix: true,
                        locale: fr 
                      })}
                    </span>
                  </div>
                </div>

                {/* Bouton supprimer */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 bg-black/60 hover:bg-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReplay(replay.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Modal lecture avec URL sécurisée */}
        {selectedReplay && (
          <ReplayModal 
            replay={selectedReplay} 
            onClose={() => setSelectedReplay(null)} 
          />
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Modal de lecture avec URL sécurisée
 */
const ReplayModal = ({ replay, onClose }: { replay: Replay; onClose: () => void }) => {
  const isR2 = isR2Url(replay.recording_url);
  
  const { secureUrl, loading } = useSecureR2Url(
    isR2 ? replay.recording_url : null,
    { liveStreamId: replay.id, enabled: isR2 }
  );
  
  const videoUrl = isR2 ? secureUrl : replay.recording_url;
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : videoUrl ? (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full rounded-lg"
          />
        ) : (
          <div className="aspect-video flex items-center justify-center bg-black rounded-lg text-white">
            Erreur de chargement
          </div>
        )}
        <div className="mt-4 text-white">
          <h3 className="text-xl font-bold">{replay.title}</h3>
          {replay.description && (
            <p className="text-white/70 mt-1">{replay.description}</p>
          )}
        </div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={onClose}
        >
          Fermer
        </Button>
      </div>
    </div>
  );
};

export default CreatorReplays;
