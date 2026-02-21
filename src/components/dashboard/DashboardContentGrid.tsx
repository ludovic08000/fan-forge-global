import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, Wand2, Plus, Upload, Trash2, Play, Video, Crown, Volume2, VolumeX, Shield, Lock, Users, Euro, Loader2 } from 'lucide-react';
import { useSecureR2Url, isR2Url } from '@/hooks/useSecureR2Url';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Content {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  content_type: string;
  view_count: number | null;
  like_count: number | null;
  is_premium: boolean | null;
}

interface PrivateReplay {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  file_path: string;
  duration: number | null;
  original_price: number;
  replay_price: number;
  is_available: boolean;
  purchase_count: number;
  created_at: string;
}

interface DashboardContentGridProps {
  content: Content[] | undefined;
  isLoading: boolean;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onDeleteContent: (contentId: string) => void;
  onNewContent: () => void;
}

// Composant pour une carte de contenu avec preview vidéo sécurisée
const SecureContentCard: React.FC<{
  item: Content;
  index: number;
  onOpenLightbox: (content: Content, index: number) => void;
  onEditContent: (content: Content) => void;
  onDeleteContent: (contentId: string) => void;
}> = ({ item, index, onOpenLightbox, onEditContent, onDeleteContent }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  
  const isVideo = item.content_type === 'video';
  const isReplay = item.title?.toLowerCase().includes('replay');
  const isPremium = item.is_premium === true;
  const isExternalR2 = isR2Url(item.file_url);

  // Hook pour URLs R2 sécurisées — pour TOUT contenu R2 (images + vidéos)
  const { secureUrl: r2SecureUrl, loading: r2Loading } = useSecureR2Url(
    isExternalR2 ? item.file_url : null,
    {
      contentId: item.id,
      enabled: isExternalR2
    }
  );

  // URL sécurisée finale pour vidéos
  const secureVideoUrl = isExternalR2 ? r2SecureUrl : item.file_url;
  // URL sécurisée pour images
  const secureImageUrl = isExternalR2 ? r2SecureUrl : item.file_url;
  
  const urlLoading = r2Loading;

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (videoRef.current && isVideo && secureVideoUrl && !videoError) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setVideoError(true);
      });
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  // Reset error state when URL changes
  useEffect(() => {
    setVideoError(false);
    setVideoReady(false);
  }, [secureVideoUrl]);

  return (
    <Card className="overflow-hidden group card-premium">
      <div 
        className="aspect-square overflow-hidden relative cursor-pointer"
        onClick={() => onOpenLightbox(item, index)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Video player pour les vidéos */}
        {isVideo && (
          <>
            {/* Skeleton discret pendant chargement URL signée */}
            {urlLoading && (
              <Skeleton className="absolute inset-0 z-20" />
            )}

            {/* Video element sécurisé - toujours présent mais caché quand pas en hover */}
            {secureVideoUrl && !videoError && (
              <video
                ref={videoRef}
                src={secureVideoUrl}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isHovering && videoReady ? 'opacity-100' : 'opacity-0'
                }`}
                muted={isMuted}
                loop
                playsInline
                preload="auto"
                {...(!isExternalR2 && { crossOrigin: "anonymous" })}
                onLoadedData={() => setVideoReady(true)}
                onCanPlay={() => setVideoReady(true)}
                onError={() => setVideoError(true)}
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                style={{ pointerEvents: isHovering ? 'auto' : 'none' }}
              />
            )}
            
            {/* Overlay statique quand pas en hover */}
            <div className={`absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 via-background to-primary/10 flex flex-col items-center justify-center transition-opacity duration-300 ${
              isHovering && !videoError && videoReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}>
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(var(--primary)) 2px, transparent 2px)',
                  backgroundSize: '20px 20px'
                }} />
              </div>
              
              {/* Play button premium */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
                  <Play className="h-7 w-7 text-primary-foreground ml-1" fill="currentColor" />
                </div>
                
                {isReplay && (
                  <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
                    <Video className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Replay Live</span>
                  </div>
                )}
              </div>
            </div>

            {/* Indicateur de contenu sécurisé R2 ou Premium */}
            {(isExternalR2 || isPremium) && isHovering && !videoError && videoReady && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-green-500/90 px-2 py-0.5 rounded-full">
                <Shield className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">
                  {isExternalR2 ? 'R2 Sécurisé' : 'Sécurisé'}
                </span>
              </div>
            )}

            {/* Mute button pendant le hover */}
            {isHovering && !videoError && secureVideoUrl && videoReady && (
              <button
                onClick={toggleMute}
                className="absolute bottom-2 left-2 z-20 p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-white" />
                ) : (
                  <Volume2 className="h-4 w-4 text-white" />
                )}
              </button>
            )}

            {/* Premium badge overlay */}
            {isPremium && !isHovering && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-full z-10">
                <Crown className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">Premium</span>
              </div>
            )}
          </>
        )}

        {/* Image pour les contenus non-vidéo */}
        {!isVideo && (
          <>
            {urlLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <img
                src={secureImageUrl || item.thumbnail_url || item.file_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
                loading="lazy"
              />
            )}
            {isPremium && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 rounded-full z-10">
                <Crown className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">Premium</span>
              </div>
            )}
          </>
        )}
        
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          {item.content_type === 'image' && (
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onEditContent(item);
              }}
            >
              <Wand2 className="h-4 w-4 text-primary" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteContent(item.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-1">{item.title}</h3>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.view_count || 0}</span>
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{item.like_count || 0}</span>
          </div>
          <Badge variant={isPremium ? "default" : "secondary"} className="text-[10px]">
            {isPremium ? 'Premium' : 'Gratuit'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant pour une carte de replay privé (côté créateur)
const PrivateReplayCard: React.FC<{
  replay: PrivateReplay;
  onToggleAvailability: (id: string, isAvailable: boolean) => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  onDelete: (id: string) => void;
}> = ({ replay, onToggleAvailability, onUpdatePrice, onDelete }) => {
  const [showPriceEdit, setShowPriceEdit] = useState(false);
  const [newPrice, setNewPrice] = useState(replay.replay_price);
  const [updating, setUpdating] = useState(false);

  const handleSavePrice = async () => {
    if (newPrice < 1) {
      toast.error('Le prix minimum est 1€');
      return;
    }
    setUpdating(true);
    await onUpdatePrice(replay.id, newPrice);
    setUpdating(false);
    setShowPriceEdit(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const durationSeconds = replay.duration;

  return (
    <Card className="overflow-hidden group card-premium">
      <div className="aspect-video relative">
        {/* Thumbnail floutée avec overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/80 to-primary/20">
          {replay.thumbnail_url && (
            <img
              src={replay.thumbnail_url}
              alt={replay.title}
              className="w-full h-full object-cover blur-md opacity-50"
            />
          )}
        </div>

        {/* Overlay avec infos */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-3">
            <Lock className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{replay.replay_price}€</span>
          <span className="text-xs text-muted-foreground mt-1">
            Prix original: {replay.original_price}€
          </span>
        </div>

        {/* Badge durée */}
        {durationSeconds && (
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-xs text-white">
            {formatDuration(durationSeconds)}
          </div>
        )}

        {/* Badge statut */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
          replay.is_available 
            ? 'bg-green-500/90 text-white' 
            : 'bg-muted text-muted-foreground'
        }`}>
          {replay.is_available ? 'En vente' : 'Masqué'}
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        <h3 className="font-medium text-sm line-clamp-1">{replay.title}</h3>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {replay.purchase_count} achat{replay.purchase_count > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Euro className="h-3 w-3" />
            {(replay.purchase_count * replay.replay_price * 0.85).toFixed(0)}€ gagnés
          </span>
        </div>

        <div className="flex gap-1 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={() => setShowPriceEdit(true)}
          >
            <Euro className="h-3 w-3 mr-1" />
            Prix
          </Button>
          <Button
            variant={replay.is_available ? "secondary" : "default"}
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={() => onToggleAvailability(replay.id, !replay.is_available)}
          >
            {replay.is_available ? 'Masquer' : 'Activer'}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (confirm('Supprimer ce replay définitivement ?')) {
                onDelete(replay.id);
              }
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>

      {/* Dialog édition prix */}
      <Dialog open={showPriceEdit} onOpenChange={setShowPriceEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le prix du replay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prix de vente (€)</label>
              <input
                type="number"
                min={1}
                step={0.5}
                value={newPrice}
                onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Prix original du show: {replay.original_price}€ • Vous recevrez 85% ({(newPrice * 0.85).toFixed(2)}€)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPriceEdit(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleSavePrice} disabled={updating} className="flex-1">
                {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Section des replays privés payants
const PrivateReplaysSection: React.FC = () => {
  const { user } = useAuth();

  const { data: replays, isLoading, refetch } = useQuery({
    queryKey: ['creator-private-replays', user?.id],
    queryFn: async () => {
      // Récupérer le creator_id
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!creator) return [];

      const { data, error } = await supabase
        .from('private_live_replays')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PrivateReplay[];
    },
    enabled: !!user,
  });

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    const { error } = await supabase
      .from('private_live_replays')
      .update({ is_available: isAvailable })
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      toast.success(isAvailable ? 'Replay mis en vente' : 'Replay masqué');
      refetch();
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    const { error } = await supabase
      .from('private_live_replays')
      .update({ replay_price: newPrice })
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la mise à jour du prix');
    } else {
      toast.success('Prix mis à jour');
      refetch();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-replay', {
        body: { replayId: id, replayType: 'private' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Replay supprimé');
      refetch();
    } catch (err: any) {
      console.error('Delete replay error:', err);
      toast.error('Erreur lors de la suppression: ' + (err.message || 'Erreur inconnue'));
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  if (!replays || replays.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Aucun replay privé</h3>
        <p className="text-muted-foreground">
          Les replays de vos shows privés apparaîtront ici automatiquement après chaque session
        </p>
      </div>
    );
  }

  const totalEarnings = replays.reduce((sum, r) => sum + (r.purchase_count * r.replay_price * 0.85), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {replays.length} replay{replays.length > 1 ? 's' : ''} • 
          <span className="text-primary font-medium ml-1">{totalEarnings.toFixed(0)}€ gagnés</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {replays.map((replay) => (
          <PrivateReplayCard
            key={replay.id}
            replay={replay}
            onToggleAvailability={handleToggleAvailability}
            onUpdatePrice={handleUpdatePrice}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

export const DashboardContentGrid: React.FC<DashboardContentGridProps> = ({
  content,
  isLoading,
  onOpenLightbox,
  onEditContent,
  onDeleteContent,
  onNewContent,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Mon contenu</h2>
        <Badge variant="outline">{content?.length || 0} contenu{(content?.length || 0) > 1 ? 's' : ''}</Badge>
      </div>

      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Ma galerie
          </TabsTrigger>
          <TabsTrigger value="private-replays" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Replays privés
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0 w-full">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>
          ) : content && content.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0">
              {content.map((item, index) => (
                <SecureContentCard
                  key={item.id}
                  item={item}
                  index={index}
                  onOpenLightbox={onOpenLightbox}
                  onEditContent={onEditContent}
                  onDeleteContent={onDeleteContent}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Aucun contenu</h3>
              <p className="text-muted-foreground mb-4">Commencez à partager avec votre audience</p>
              <Button onClick={onNewContent} variant="premium">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter du contenu
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="private-replays" className="mt-6">
          <PrivateReplaysSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardContentGrid;
