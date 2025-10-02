/**
 * Page listant tous les live streams disponibles
 * Affiche les lives en cours et à venir
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Circle, Users, Calendar, Play } from 'lucide-react';
import { useLiveStream } from '@/hooks/useLiveStream';

/**
 * Page des live streams
 */
const LiveStreams = () => {
  const { liveStreams, loading, fetchLiveStreams } = useLiveStream();

  useEffect(() => {
    fetchLiveStreams();
  }, []);

  const liveNow = liveStreams.filter((s) => s.status === 'live');
  const upcoming = liveStreams.filter((s) => s.status === 'scheduled');
  const ended = liveStreams.filter((s) => s.status === 'ended');

  /**
   * Carte de live stream
   */
  const StreamCard = ({ stream }: { stream: any }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-video bg-black">
        <img
          src={stream.thumbnail_url || '/placeholder.svg'}
          alt={stream.title}
          className="w-full h-full object-cover"
        />
        
        {stream.status === 'live' && (
          <div className="absolute top-3 left-3">
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Circle className="h-2 w-2 fill-current" />
              EN DIRECT
            </Badge>
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span>{stream.viewer_count || 0}</span>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" />
            <AvatarFallback>CR</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 mb-1">{stream.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">Nom du créateur</p>
            
            {stream.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {stream.description}
              </p>
            )}

            <div className="flex items-center gap-2">
              {stream.is_premium && (
                <Badge variant="secondary">
                  Premium - {stream.price}€
                </Badge>
              )}
              
              {stream.status === 'scheduled' && stream.scheduled_at && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(stream.scheduled_at).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        </div>

        <Button className="w-full mt-4" asChild>
          <Link to={`/live/${stream.id}`}>
            <Play className="h-4 w-4 mr-2" />
            {stream.status === 'live' ? 'Regarder' : 'Voir les détails'}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des lives...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Live Streams</h1>
        <p className="text-muted-foreground">
          Découvrez les lives en cours et à venir de vos créateurs préférés
        </p>
      </div>

      <Tabs defaultValue="live" className="space-y-6">
        <TabsList>
          <TabsTrigger value="live" className="gap-2">
            <Circle className="h-3 w-3 fill-destructive text-destructive animate-pulse" />
            En direct ({liveNow.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            À venir ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="ended">
            Terminés ({ended.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          {liveNow.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-muted-foreground">
                  Aucun live en cours
                </CardTitle>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {liveNow.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          {upcoming.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-muted-foreground">
                  Aucun live programmé
                </CardTitle>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ended" className="space-y-6">
          {ended.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-muted-foreground">
                  Aucun live terminé
                </CardTitle>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ended.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LiveStreams;
