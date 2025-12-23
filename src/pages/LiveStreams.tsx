/**
 * Page listant tous les live streams disponibles
 * Affiche les lives en cours et à venir
 * Lives gratuits: visibles, Lives premium: floutés si non abonné
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Circle, Users, Calendar, Play, Lock } from 'lucide-react';
import { useLiveStream, LiveStream } from '@/hooks/useLiveStream';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SEOHead from '@/components/SEOHead';

interface CreatorInfo {
  id: string;
  stage_name: string | null;
  avatar_url: string | null;
  display_name: string | null;
}

/**
 * Page des live streams
 */
const LiveStreams = () => {
  const { liveStreams, loading, fetchLiveStreams } = useLiveStream();
  const { user } = useAuth();
  const [creatorInfos, setCreatorInfos] = useState<Record<string, CreatorInfo>>({});
  const [userSubscriptions, setUserSubscriptions] = useState<string[]>([]);

  // Charger les lives et mettre en place le temps réel
  useEffect(() => {
    fetchLiveStreams();

    // Écouter les changements en temps réel sur la table live_streams
    const channel = supabase
      .channel('live-streams-realtime-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        (payload) => {
          console.log('[LiveStreams Page] Real-time update:', payload.eventType, payload);
          // Recharger la liste complète pour avoir les données à jour
          fetchLiveStreams();
        }
      )
      .subscribe((status) => {
        console.log('[LiveStreams Page] Realtime subscription status:', status);
      });

    return () => {
      console.log('[LiveStreams Page] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Charger les infos des créateurs et les abonnements de l'utilisateur
  useEffect(() => {
    const loadCreatorInfos = async () => {
      if (liveStreams.length === 0) return;
      
      const creatorIds = [...new Set(liveStreams.map(s => s.creator_id))];
      
      // Récupérer les infos des créateurs via la vue publique
      const { data: creators } = await supabase
        .from('public_creators')
        .select('id, stage_name, user_id')
        .in('id', creatorIds);

      if (creators) {
        // Récupérer les profils associés
        const userIds = creators.map(c => c.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('public_creator_profiles')
          .select('user_id, avatar_url, display_name')
          .in('user_id', userIds);

        const infos: Record<string, CreatorInfo> = {};
        creators.forEach(creator => {
          const profile = profiles?.find(p => p.user_id === creator.user_id);
          infos[creator.id!] = {
            id: creator.id!,
            stage_name: creator.stage_name,
            avatar_url: profile?.avatar_url || null,
            display_name: profile?.display_name || creator.stage_name || 'Créateur',
          };
        });
        setCreatorInfos(infos);
      }
    };

    const loadUserSubscriptions = async () => {
      if (!user) return;
      
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('subscriber_id', user.id)
        .eq('status', 'active');
      
      if (subs) {
        setUserSubscriptions(subs.map(s => s.creator_id));
      }
    };

    loadCreatorInfos();
    loadUserSubscriptions();
  }, [liveStreams, user]);

  // Vérifier si l'utilisateur a accès à un live premium
  const hasAccess = (stream: LiveStream) => {
    if (!stream.is_premium) return true;
    if (!user) return false;
    return userSubscriptions.includes(stream.creator_id);
  };

  // Filtrer les lives en cours et à venir (exclure les terminés et annulés)
  const liveNow = liveStreams.filter((s) => s.status === 'live');
  const upcoming = liveStreams.filter((s) => s.status === 'scheduled');

  /**
   * Carte de live stream
   */
  const StreamCard = ({ stream }: { stream: LiveStream }) => {
    const creatorInfo = creatorInfos[stream.creator_id];
    const canAccess = hasAccess(stream);
    const isPremium = stream.is_premium;

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-video bg-black">
          {/* Image avec flou pour les lives premium non accessibles */}
          <img
            src={stream.thumbnail_url || '/placeholder.svg'}
            alt={stream.title}
            className={`w-full h-full object-cover transition-all ${
              isPremium && !canAccess ? 'blur-lg scale-105' : ''
            }`}
          />
          
          {/* Overlay pour les lives premium non accessibles */}
          {isPremium && !canAccess && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
              <Lock className="h-8 w-8 text-white mb-2" />
              <span className="text-white font-semibold">Contenu Premium</span>
              <span className="text-white/80 text-sm">{stream.price}€</span>
            </div>
          )}
          
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
              <AvatarImage src={creatorInfo?.avatar_url || ''} />
              <AvatarFallback>
                {creatorInfo?.display_name?.charAt(0).toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold line-clamp-2 mb-1">{stream.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {creatorInfo?.stage_name || creatorInfo?.display_name || 'Créateur'}
              </p>
              
              {stream.description && !isPremium && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {stream.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                {isPremium && (
                  <Badge variant={canAccess ? 'default' : 'secondary'}>
                    {canAccess ? '✓ Accès Premium' : `Premium - ${stream.price}€`}
                  </Badge>
                )}
                {!isPremium && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Gratuit
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

          <Button 
            className="w-full mt-4" 
            variant={canAccess || !isPremium ? 'default' : 'secondary'}
            asChild
          >
            <Link to={`/live/${stream.id}`}>
              {isPremium && !canAccess ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  S'abonner pour regarder
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {stream.status === 'live' ? 'Regarder' : 'Voir les détails'}
                </>
              )}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

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
      <SEOHead 
        title="Lives en Direct - Streaming Créateurs - CreatorHub"
        description="Regardez les lives en direct de vos créateurs préférés sur CreatorHub. Streaming HD, chat en direct, replay disponible. Découvrez les prochains lives programmés."
        keywords="live streaming, direct créateurs, streaming France, lives en cours, regarder live"
        url="https://creatorhub.com/lives"
      />
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

      </Tabs>
    </div>
  );
};

export default LiveStreams;
