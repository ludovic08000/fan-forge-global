/**
 * Composant pour afficher les replays de lives privés vendables
 * Les utilisateurs peuvent acheter et regarder ces replays
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Video, Eye, Clock, Lock, ShoppingCart, Loader2, 
  Check, Play, Volume2, VolumeX, Coins 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface PrivateLiveReplay {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  original_price: number;
  replay_price: number;
  currency: string;
  view_count: number;
  purchase_count: number;
  created_at: string;
}

interface PrivateLiveReplaysProps {
  creatorId: string;
  creatorName?: string;
}

export const PrivateLiveReplays = ({ creatorId, creatorName }: PrivateLiveReplaysProps) => {
  const { user } = useAuth();
  const [replays, setReplays] = useState<PrivateLiveReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [selectedReplay, setSelectedReplay] = useState<PrivateLiveReplay | null>(null);

  useEffect(() => {
    const loadReplays = async () => {
      if (!creatorId) return;

      try {
        // Charger les replays disponibles
        const { data, error } = await supabase
          .from('private_live_replays')
          .select('*')
          .eq('creator_id', creatorId)
          .eq('is_available', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setReplays(data || []);

        // Vérifier les achats de l'utilisateur
        if (user && data && data.length > 0) {
          const { data: purchases } = await supabase
            .from('private_live_replay_purchases')
            .select('replay_id')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .in('replay_id', data.map(r => r.id));

          if (purchases) {
            setPurchasedIds(new Set(purchases.map(p => p.replay_id)));
          }
        }
      } catch (error) {
        console.error('Erreur chargement replays privés:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReplays();
  }, [creatorId, user]);

  // Vérifier les paramètres URL pour les achats réussis
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('replay_purchase_success') === 'true') {
      const replayId = params.get('replay_id');
      toast.success('Achat confirmé ! 🎬', {
        description: 'Vous pouvez maintenant regarder le replay'
      });
      if (replayId) {
        setPurchasedIds(prev => new Set(prev).add(replayId));
      }
      // Nettoyer l'URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          Replays exclusifs
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
        <Video className="h-6 w-6 text-primary" />
        Replays exclusifs
        <Badge variant="secondary" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
          <Coins className="h-3 w-3 mr-1" />
          À l'achat
        </Badge>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {replays.map((replay) => (
          <PrivateReplayCard
            key={replay.id}
            replay={replay}
            isPurchased={purchasedIds.has(replay.id)}
            creatorName={creatorName}
            onSelect={() => setSelectedReplay(replay)}
            onPurchaseComplete={() => setPurchasedIds(prev => new Set(prev).add(replay.id))}
          />
        ))}
      </div>

      {selectedReplay && purchasedIds.has(selectedReplay.id) && (
        <PrivateReplayModal
          replay={selectedReplay}
          onClose={() => setSelectedReplay(null)}
        />
      )}
    </div>
  );
};

/**
 * Carte de replay privé
 */
const PrivateReplayCard = ({
  replay,
  isPurchased,
  creatorName,
  onSelect,
  onPurchaseComplete
}: {
  replay: PrivateLiveReplay;
  isPurchased: boolean;
  creatorName?: string;
  onSelect: () => void;
  onPurchaseComplete: () => void;
}) => {
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Connectez-vous pour acheter ce replay');
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('buy-private-replay', {
        body: {
          replayId: replay.id,
          returnUrl: window.location.href,
        },
      });

      if (error) throw error;

      if (data.alreadyPurchased) {
        onPurchaseComplete();
        toast.success('Vous avez déjà acheté ce replay !');
        return;
      }

      if (data.url) {
        window.open(data.url, '_blank');
        toast.info('Finalisez votre achat dans le nouvel onglet');
      }
    } catch (error: any) {
      console.error('Erreur achat:', error);
      toast.error(error.message || 'Erreur lors de l\'achat');
    } finally {
      setPurchasing(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <Card
      className={`group overflow-hidden transition-all ${
        isPurchased ? 'hover:border-primary/50 cursor-pointer' : ''
      }`}
      onClick={isPurchased ? onSelect : undefined}
    >
      <div className="aspect-video relative bg-neutral-900">
        {isPurchased ? (
          // Replay acheté - afficher normalement
          <div className="w-full h-full relative">
            {replay.thumbnail_url ? (
              <img
                src={replay.thumbnail_url}
                alt={replay.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Video className="h-8 w-8 text-primary/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white rounded-full p-3">
                <Play className="h-6 w-6 text-black fill-black" />
              </div>
            </div>
            <Badge className="absolute top-2 left-2 bg-green-500">
              <Check className="h-3 w-3 mr-1" />
              Acheté
            </Badge>
          </div>
        ) : (
          // Non acheté - verrouillé avec bouton d'achat
          <div className="w-full h-full relative">
            {replay.thumbnail_url ? (
              <img
                src={replay.thumbnail_url}
                alt=""
                className="w-full h-full object-cover blur-xl scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-2">
              <Lock className="h-6 w-6 text-white mb-2" />
              <Button
                size="sm"
                variant="premium"
                onClick={handlePurchase}
                disabled={purchasing}
                className="text-xs"
              >
                {purchasing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {replay.replay_price.toFixed(2)}€
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {replay.duration && (
          <Badge
            variant="secondary"
            className="absolute bottom-2 right-2 bg-black/70 text-white"
          >
            <Clock className="h-3 w-3 mr-1" />
            {formatDuration(replay.duration)}
          </Badge>
        )}
      </div>

      <div className="p-3 space-y-1">
        <h4 className="font-medium truncate text-sm">{replay.title}</h4>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {replay.view_count}
          </span>
          <span className="flex items-center gap-1">
            <ShoppingCart className="h-3 w-3" />
            {replay.purchase_count} ventes
          </span>
        </div>
        {!isPurchased && (
          <p className="text-xs text-muted-foreground">
            Replay de live privé de {creatorName || 'ce créateur'}
          </p>
        )}
      </div>
    </Card>
  );
};

/**
 * Modal de lecture du replay
 */
const PrivateReplayModal = ({
  replay,
  onClose
}: {
  replay: PrivateLiveReplay;
  onClose: () => void;
}) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-private-replay-url', {
          body: { replayId: replay.id }
        });

        if (error) throw error;

        if (data?.url) {
          setVideoUrl(data.url);
        } else {
          throw new Error('URL non disponible');
        }
      } catch (err: any) {
        console.error('Erreur chargement vidéo:', err);
        setError(err.message || 'Impossible de charger la vidéo');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [replay.id]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="max-w-4xl w-full" 
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="aspect-video flex flex-col items-center justify-center bg-black rounded-lg text-white gap-4">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : videoUrl ? (
          <div className="relative">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full rounded-lg"
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onContextMenu={(e) => e.preventDefault()}
              style={{ userSelect: 'none' }}
            />
            <button
              onClick={toggleMute}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        ) : null}

        <div className="mt-4 text-white">
          <h3 className="text-xl font-bold">{replay.title}</h3>
          {replay.description && (
            <p className="text-white/70 mt-1">{replay.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {replay.view_count} vues
            </span>
            <span>
              {formatDistanceToNow(new Date(replay.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </span>
          </div>
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

export default PrivateLiveReplays;
