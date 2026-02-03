/**
 * Carte de replay - lecture automatique comme les vidéos de contenu
 */

import { useRef, useState, useCallback, memo } from 'react';
import { Eye, Clock, Trash2, Volume2, VolumeX } from 'lucide-react';
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
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(replay.id);
  }, [onDelete, replay.id]);

  return (
    <div 
      className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer bg-card"
      onClick={() => onSelect(replay)}
    >
      {/* Video - lecture automatique directe */}
      <div className="aspect-video relative bg-neutral-900">
        {signedUrl ? (
          <video
            ref={videoRef}
            src={signedUrl}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
          />
        ) : replay.thumbnail_url ? (
          <img
            src={replay.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
        )}

        {/* Badge premium */}
        {replay.is_premium && (
          <Badge className="absolute top-2 left-2 z-10 bg-amber-500 text-white">
            Premium
          </Badge>
        )}

        {/* Mute button */}
        {signedUrl && (
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
