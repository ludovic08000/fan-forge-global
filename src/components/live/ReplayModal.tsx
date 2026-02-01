/**
 * Modal de lecture de replay avec URL sécurisée
 */

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : signedUrl ? (
          <video
            src={signedUrl}
            controls
            autoPlay
            className="w-full rounded-lg"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
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

export default ReplayModal;
