/**
 * Page pour regarder un live stream spécifique
 */

import { useParams } from 'react-router-dom';
import { LiveStreamViewer } from '@/components/LiveStreamViewer';

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

  return <LiveStreamViewer streamId={streamId} />;
};

export default WatchLive;
