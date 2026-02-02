/**
 * Modal de lecture de replay avec player premium
 */

import { X, Loader2 } from 'lucide-react';
import { PremiumVideoPlayer } from '@/components/gallery/PremiumVideoPlayer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Replay {
  id: string;
  title: string;
  description: string | null;
  recording_url: string;
}

interface ReplayModalProps {
  replay: Replay;
  signedUrl: string | null;
  loading: boolean;
  onClose: () => void;
}

export const ReplayModal = ({ replay, signedUrl, loading, onClose }: ReplayModalProps) => {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-black border-none"
        aria-describedby="replay-description"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{replay.title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {loading ? (
            <div className="aspect-video flex items-center justify-center bg-black">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : signedUrl ? (
            <div className="aspect-video">
              <PremiumVideoPlayer
                src={signedUrl}
                autoPlay
                onClose={onClose}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center bg-black text-white">
              <div className="text-center">
                <p className="text-lg font-medium mb-2">Erreur de chargement</p>
                <p className="text-muted-foreground text-sm">Impossible de charger le replay</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Info du replay */}
        <div id="replay-description" className="p-4 bg-background">
          <h3 className="text-lg font-bold text-foreground">{replay.title}</h3>
          {replay.description && (
            <p className="text-muted-foreground mt-1 text-sm">{replay.description}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReplayModal;
