/**
 * Carte de replay optimisée pour affichage instantané
 * Utilise le thumbnail immédiatement et ne charge la vidéo qu'au hover
 */

import { useState, useRef, useCallback, memo } from 'react';
import { Play, Eye, Clock, Trash2, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface ReplayCardProps {
  replay: Replay;
  signedUrl: string | null;
  onSelect: (replay: Replay) => void;
  onDelete: (id: string) => void;
}

export const ReplayCard = memo(({ replay, signedUrl, onSelect, onDelete }: ReplayCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (videoRef.current && signedUrl) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [signedUrl]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMuted(m => !m);
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(replay.id);
  }, [onDelete, replay.id]);

  return (
    <div 
      className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer bg-card"
      onClick={() => onSelect(replay)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Preview - Thumbnail immédiat, vidéo au hover */}
      <div className="aspect-video relative bg-muted">
        {/* Thumbnail toujours visible en fond */}
        {replay.thumbnail_url ? (
          <img
            src={replay.thumbnail_url}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              isHovering && videoLoaded ? 'opacity-0' : 'opacity-100'
            }`}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50" />
        )}

        {/* Vidéo préchargée au hover */}
        {signedUrl && (
          <video
            ref={videoRef}
            src={signedUrl}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              isHovering && videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            muted={isMuted}
            loop
            playsInline
            preload="none"
            onLoadedData={() => setVideoLoaded(true)}
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {/* Play button overlay */}
        {!isHovering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 rounded-full p-3 shadow-lg">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Badge premium */}
        {replay.is_premium && (
          <Badge className="absolute top-2 left-2 z-10 bg-amber-500 text-white">
            Premium
          </Badge>
        )}

        {/* Mute button pendant le hover */}
        {isHovering && signedUrl && (
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

        {/* Bouton supprimer */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 bg-black/60 hover:bg-red-600 z-20"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 text-white" />
        </Button>
      </div>

      {/* Infos */}
      <div className="p-3 space-y-1">
        <h4 className="font-medium truncate text-foreground">{replay.title}</h4>
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
    </div>
  );
});

ReplayCard.displayName = 'ReplayCard';

export default ReplayCard;
