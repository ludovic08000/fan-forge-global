/**
 * Composant pour afficher les replays d'un créateur aux abonnés
 */

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Video, Eye, Clock, Play, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

interface PublicReplaysProps {
  creatorId: string;
  isSubscribed: boolean;
  creatorName?: string;
}

export const PublicReplays = ({ creatorId, isSubscribed, creatorName }: PublicReplaysProps) => {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState<Replay | null>(null);

  useEffect(() => {
    const loadReplays = async () => {
      if (!creatorId) return;

      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('id, title, description, recording_url, thumbnail_url, ended_at, peak_viewer_count, is_premium')
          .eq('creator_id', creatorId)
          .eq('status', 'ended')
          .not('recording_url', 'is', null)
          .order('ended_at', { ascending: false })
          .limit(12);

        if (error) throw error;
        setReplays(data || []);
      } catch (error) {
        console.error('Erreur chargement replays:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReplays();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Video className="h-6 w-6" />
          Replays
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (replays.length === 0) {
    return null; // Ne rien afficher s'il n'y a pas de replays
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Video className="h-6 w-6" />
        Replays
        <Badge variant="secondary">{replays.length}</Badge>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {replays.map((replay) => {
          const canAccess = !replay.is_premium || isSubscribed;
          
          return (
            <div
              key={replay.id}
              className={`group relative rounded-lg overflow-hidden border border-border transition-colors ${
                canAccess 
                  ? 'hover:border-primary/50 cursor-pointer' 
                  : 'opacity-75'
              }`}
              onClick={() => canAccess && setSelectedReplay(replay)}
            >
              {/* Preview vidéo */}
              <div className="aspect-video relative">
                {canAccess ? (
                  <SecureVideoPreviewCard
                    src={replay.recording_url}
                    liveStreamId={replay.id}
                    poster={replay.thumbnail_url}
                    isPremium={replay.is_premium}
                    className="w-full h-full"
                    blurred={!canAccess}
                    showPlayButton={true}
                  >
                    {/* Badge premium */}
                    {replay.is_premium && (
                      <Badge className="absolute top-2 left-2 z-20 bg-amber-500">
                        Premium
                      </Badge>
                    )}
                  </SecureVideoPreviewCard>
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center relative">
                    {replay.thumbnail_url ? (
                      <img 
                        src={replay.thumbnail_url} 
                        alt={replay.title}
                        className="w-full h-full object-cover blur-lg"
                      />
                    ) : (
                      <Video className="h-12 w-12 text-muted-foreground/50" />
                    )}
                    {/* Overlay lock pour non-abonnés */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="bg-white/90 rounded-full p-3">
                        <Lock className="h-6 w-6 text-black" />
                      </div>
                    </div>
                    {/* Badge premium */}
                    {replay.is_premium && (
                      <Badge className="absolute top-2 left-2 z-20 bg-amber-500">
                        Premium
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Infos */}
              <div className="p-3 space-y-1 bg-card">
                <h4 className="font-medium truncate text-sm">{replay.title}</h4>
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
                
                {!canAccess && (
                  <p className="text-xs text-amber-600 mt-1">
                    Abonnez-vous pour regarder
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal lecture avec URL sécurisée */}
      {selectedReplay && (
        <ReplayModal 
          replay={selectedReplay} 
          onClose={() => setSelectedReplay(null)} 
        />
      )}
    </div>
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
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
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

export default PublicReplays;
