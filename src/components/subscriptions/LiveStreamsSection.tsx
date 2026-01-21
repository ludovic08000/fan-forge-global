import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Calendar, Users, Lock, Play, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LiveStream } from '@/hooks/useLiveStream';
import { LiveTimer } from '@/components/live/LiveTimer';

interface CreatorInfo {
  id: string;
  stage_name: string | null;
  avatar_url: string | null;
  display_name: string | null;
}

interface LiveStreamsSectionProps {
  liveNow: LiveStream[];
  upcomingLives: LiveStream[];
  creatorInfos: Record<string, CreatorInfo>;
  hasAccess: (stream: LiveStream) => boolean;
}

export const LiveStreamsSection = ({ 
  liveNow, 
  upcomingLives, 
  creatorInfos, 
  hasAccess 
}: LiveStreamsSectionProps) => {
  if (liveNow.length === 0 && upcomingLives.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500" />
          <h2 className="text-xl font-bold">Lives</h2>
          {liveNow.length > 0 && (
            <Badge variant="destructive" className="animate-pulse text-xs">
              {liveNow.length} en direct
            </Badge>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/lives">Tout voir</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {liveNow.map((stream) => (
          <LiveCard 
            key={stream.id} 
            stream={stream} 
            creatorInfo={creatorInfos[stream.creator_id]}
            hasAccess={hasAccess(stream)}
            isLive
          />
        ))}
        {upcomingLives.map((stream) => (
          <LiveCard 
            key={stream.id} 
            stream={stream} 
            creatorInfo={creatorInfos[stream.creator_id]}
            hasAccess={hasAccess(stream)}
            isLive={false}
          />
        ))}
      </div>
    </section>
  );
};

interface LiveCardProps {
  stream: LiveStream;
  creatorInfo?: CreatorInfo;
  hasAccess: boolean;
  isLive: boolean;
}

const LiveCard = ({ stream, creatorInfo, hasAccess, isLive }: LiveCardProps) => {
  const isPremium = stream.is_premium;
  const canWatch = hasAccess || !isPremium;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-muted">
        <img
          src={stream.thumbnail_url || '/placeholder.svg'}
          alt={stream.title}
          className={`w-full h-full object-cover ${isPremium && !canWatch ? 'blur-md' : ''}`}
        />
        
        {isPremium && !canWatch && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <Lock className="h-5 w-5 text-white mb-1" />
            <span className="text-white text-xs">{stream.price}€</span>
          </div>
        )}
        
        <div className="absolute top-2 left-2">
          {isLive ? (
            <Badge variant="destructive" className="gap-1 animate-pulse text-xs px-2 py-0.5">
              <Circle className="h-1.5 w-1.5 fill-current" />
              LIVE
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-xs px-2 py-0.5">
              <Calendar className="h-3 w-3" />
              {stream.scheduled_at ? format(new Date(stream.scheduled_at), 'dd/MM HH:mm', { locale: fr }) : 'Bientôt'}
            </Badge>
          )}
        </div>

        {isLive && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
            <Users className="h-3 w-3" />
            {stream.viewer_count || 0}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={creatorInfo?.avatar_url || ''} />
            <AvatarFallback className="text-xs bg-primary/10">
              {(creatorInfo?.stage_name || 'C').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-1">{stream.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {creatorInfo?.stage_name || creatorInfo?.display_name || 'Créateur'}
            </p>
          </div>
        </div>
        
        {isLive && (
          <Button className="w-full mt-2" size="sm" asChild>
            <Link to={`/live/${stream.id}`}>
              {canWatch ? (
                <><Play className="h-3 w-3 mr-1" /> Regarder</>
              ) : (
                <><Lock className="h-3 w-3 mr-1" /> S'abonner</>
              )}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
