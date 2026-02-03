/**
 * Replays - lecture automatique avec URLs signées R2
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Video, Eye, Clock, Lock, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

export const PublicReplays = ({ creatorId, isSubscribed }: PublicReplaysProps) => {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState<Replay | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

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

        // Charger les URLs signées R2 pour les replays accessibles
        if (data && data.length > 0) {
          const urlPromises = data
            .filter(r => !r.is_premium || isSubscribed)
            .map(async (replay) => {
              try {
                const { data: urlData } = await supabase.functions.invoke('get-replay-url', {
                  body: { liveStreamId: replay.id }
                });
                return { id: replay.id, url: urlData?.url || null };
              } catch {
                return { id: replay.id, url: null };
              }
            });

          const results = await Promise.all(urlPromises);
          const urlMap: Record<string, string> = {};
          results.forEach(r => {
            if (r.url) urlMap[r.id] = r.url;
          });
          setSignedUrls(urlMap);
        }
      } catch (error) {
        console.error('Erreur chargement replays:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReplays();
  }, [creatorId, isSubscribed]);

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
    return null;
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
          const videoUrl = signedUrls[replay.id];
          
          return (
            <ReplayCard
              key={replay.id}
              replay={replay}
              videoUrl={videoUrl}
              canAccess={canAccess}
              onSelect={() => canAccess && setSelectedReplay(replay)}
            />
          );
        })}
      </div>

      {selectedReplay && (
        <ReplayModal 
          replay={selectedReplay}
          videoUrl={signedUrls[selectedReplay.id]}
          onClose={() => setSelectedReplay(null)} 
        />
      )}
    </div>
  );
};

/**
 * Carte replay avec lecture automatique
 */
const ReplayCard = ({ 
  replay, 
  videoUrl,
  canAccess, 
  onSelect 
}: { 
  replay: Replay; 
  videoUrl: string | undefined;
  canAccess: boolean; 
  onSelect: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  return (
    <div
      className={`group relative rounded-lg overflow-hidden border border-border transition-colors ${
        canAccess ? 'hover:border-primary/50 cursor-pointer' : 'opacity-75'
      }`}
      onClick={onSelect}
    >
      <div className="aspect-video relative bg-neutral-900">
        {canAccess ? (
          <>
            {/* Thumbnail visible immédiatement, caché quand vidéo prête */}
            {replay.thumbnail_url && (
              <img 
                src={replay.thumbnail_url} 
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  videoReady ? 'opacity-0' : 'opacity-100'
                }`}
              />
            )}
            
            {/* Vidéo en background, visible quand prête */}
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  videoReady ? 'opacity-100' : 'opacity-0'
                }`}
                muted
                loop
                autoPlay
                playsInline
                preload="auto"
                onCanPlay={() => setVideoReady(true)}
              />
            )}
            
            {/* Mute button */}
            {videoReady && (
              <button
                onClick={toggleMute}
                className="absolute bottom-2 left-2 z-20 p-1.5 rounded-full bg-black/60"
              >
                {isMuted ? (
                  <VolumeX className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-white" />
                )}
              </button>
            )}
          </>
        ) : (
          // Non abonné - contenu verrouillé
          <div className="w-full h-full relative">
            {replay.thumbnail_url ? (
              <img 
                src={replay.thumbnail_url} 
                alt={replay.title}
                className="w-full h-full object-cover blur-lg"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="bg-white/90 rounded-full p-3">
                <Lock className="h-6 w-6 text-black" />
              </div>
            </div>
          </div>
        )}

        {replay.is_premium && (
          <Badge className="absolute top-2 left-2 z-20 bg-amber-500">
            Premium
          </Badge>
        )}
      </div>

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
};

/**
 * Modal plein écran
 */
const ReplayModal = ({ 
  replay, 
  videoUrl,
  onClose 
}: { 
  replay: Replay; 
  videoUrl: string | undefined;
  onClose: () => void;
}) => {
  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        {videoUrl ? (
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
            Chargement...
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