/**
 * Page pour regarder un live stream spécifique
 */

import { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Lazy load LiveStreamViewer to avoid blocking if livekit-client fails
const LiveStreamViewer = lazy(() => 
  import('@/components/LiveStreamViewer').then(m => ({ default: m.LiveStreamViewer }))
);

/**
 * Fallback pendant le chargement
 */
const LoadingFallback = () => (
  <div className="container mx-auto py-8 px-4">
    <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
      <Loader2 className="h-12 w-12 animate-spin mb-4" />
      <p>Chargement du lecteur...</p>
    </div>
  </div>
);

/**
 * Page de visualisation d'un live
 */
const WatchLive = () => {
  const { streamId } = useParams<{ streamId: string }>();

  if (!streamId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Live introuvable</h1>
          <p className="text-muted-foreground">Aucun live n'a été trouvé.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <LiveStreamViewer streamId={streamId} />
    </Suspense>
  );
};

export default WatchLive;
