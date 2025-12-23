import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Calendar, ExternalLink, Settings, Loader2, RefreshCw, Search, TrendingUp, Radio, Users, Lock, Play, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { EmbeddedCheckout } from '@/components/EmbeddedCheckout';
import SearchBar from '@/components/SearchBar';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveStream } from '@/hooks/useLiveStream';
import { LiveTimer } from '@/components/live/LiveTimer';

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  price: number;
  currency: string;
  creator: {
    id: string;
    stage_name: string | null;
    subscription_price: number;
    profile: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  };
}

interface CreatorInfo {
  id: string;
  stage_name: string | null;
  avatar_url: string | null;
  display_name: string | null;
}

const MySubscriptions = () => {
  const { user, loading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [livesLoading, setLivesLoading] = useState(true);
  const [creatorInfos, setCreatorInfos] = useState<Record<string, CreatorInfo>>({});
  const [userSubscriptions, setUserSubscriptions] = useState<string[]>([]);

  // Charger les lives et écouter en temps réel directement ici
  useEffect(() => {
    const fetchLives = async () => {
      setLivesLoading(true);
      const { data, error } = await supabase
        .from('public_live_streams')
        .select('*')
        .in('status', ['live', 'scheduled'])
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        // Filtrer les lives fantômes
        const validLives = data.filter(stream => {
          if (stream.status !== 'live') return true;
          if (!stream.started_at) return false;
          const startedAt = new Date(stream.started_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);
          if (diffMinutes > 5 && (!stream.viewer_count || stream.viewer_count === 0)) {
            return false;
          }
          return true;
        });
        setLiveStreams(validLives as LiveStream[]);
      }
      setLivesLoading(false);
    };

    fetchLives();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel('mysubscriptions-lives-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        (payload) => {
          console.log('[MySubscriptions] Realtime event:', payload.eventType);
          // Recharger immédiatement
          fetchLives();
        }
      )
      .subscribe((status) => {
        console.log('[MySubscriptions] Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Charger les infos des créateurs pour les lives
  useEffect(() => {
    const loadCreatorInfos = async () => {
      if (liveStreams.length === 0) return;
      
      const creatorIds = [...new Set(liveStreams.map(s => s.creator_id))];
      
      const { data: creators } = await supabase
        .from('public_creators')
        .select('id, stage_name, user_id')
        .in('id', creatorIds);

      if (creators) {
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

    loadCreatorInfos();
  }, [liveStreams]);

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select(`
            id,
            status,
            start_date,
            end_date,
            price,
            currency,
            creator:creators!subscriptions_creator_id_fkey (
              id,
              stage_name,
              subscription_price,
              user_id
            )
          `)
          .eq('subscriber_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch profiles for each creator
        const subscriptionsWithProfiles = await Promise.all(
          (data || []).map(async (sub: any) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url')
              .eq('user_id', sub.creator.user_id)
              .single();

            return {
              ...sub,
              creator: {
                ...sub.creator,
                profile: profileData
              }
            };
          })
        );

        setSubscriptions(subscriptionsWithProfiles);
        // Stocker les IDs des créateurs auxquels l'utilisateur est abonné
        setUserSubscriptions(subscriptionsWithProfiles.filter(s => s.status === 'active').map(s => s.creator.id));
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptions();
  }, [user]);

  // Vérifier si l'utilisateur a accès à un live premium
  const hasAccess = (stream: LiveStream) => {
    // Live gratuit = accessible à tous (is_premium false OU prix = 0)
    if (!stream.is_premium || stream.price === 0 || stream.price === null) return true;
    if (!user) return false;
    return userSubscriptions.includes(stream.creator_id);
  };

  // Filtrer les lives en cours
  const liveNow = liveStreams.filter((s) => s.status === 'live');
  const upcomingLives = liveStreams.filter((s) => s.status === 'scheduled').slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const expiredSubscriptions = subscriptions.filter(s => s.status !== 'active');

  // Fetch most active creators
  const { data: activeCreators, isLoading: creatorsLoading } = useQuery({
    queryKey: ['active-creators'],
    queryFn: async () => {
      const { data: creators, error } = await supabase
        .from('creators')
        .select('id, stage_name, subscription_price, total_content, total_subscribers, user_id')
        .order('total_content', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Fetch profiles for each creator
      const creatorsWithProfiles = await Promise.all(
        (creators || []).map(async (creator) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', creator.user_id)
            .single();
          return { ...creator, profile };
        })
      );

      return creatorsWithProfiles;
    }
  });

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Search Section - Centered */}
        <div className="flex flex-col items-center text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Découvrez des créateurs
          </h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Recherchez parmi nos créateurs et trouvez du contenu exclusif
          </p>
          <div className="w-full max-w-xl">
            <SearchBar placeholder="Rechercher un créateur..." />
          </div>
        </div>

        {/* Section Lives en direct */}
        {(liveNow.length > 0 || upcomingLives.length > 0) && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Radio className="h-6 w-6 text-red-500" />
                <h2 className="text-2xl font-bold">Lives</h2>
                {liveNow.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {liveNow.length} en direct
                  </Badge>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/lives">Voir tous les lives</Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Lives en cours */}
              {liveNow.map((stream) => {
                const creatorInfo = creatorInfos[stream.creator_id];
                const canAccess = hasAccess(stream);
                const isPremium = stream.is_premium;

                return (
                  <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-video bg-black">
                      <img
                        src={stream.thumbnail_url || '/placeholder.svg'}
                        alt={stream.title}
                        className={`w-full h-full object-cover ${
                          isPremium && !canAccess ? 'blur-lg scale-105' : ''
                        }`}
                      />
                      
                      {isPremium && !canAccess && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                          <Lock className="h-6 w-6 text-white mb-1" />
                          <span className="text-white text-sm font-medium">Premium - {stream.price}€</span>
                        </div>
                      )}
                      
                      <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap">
                        <Badge variant="destructive" className="gap-1 animate-pulse text-xs">
                          <Circle className="h-2 w-2 fill-current" />
                          LIVE
                        </Badge>
                        {stream.started_at && (
                          <LiveTimer startedAt={stream.started_at} compact />
                        )}
                      </div>

                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{stream.viewer_count || 0}</span>
                      </div>
                    </div>

                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={creatorInfo?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {(creatorInfo?.stage_name || creatorInfo?.display_name || 'C').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm line-clamp-1">{stream.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {creatorInfo?.stage_name || creatorInfo?.display_name || 'Créateur'}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        size="sm"
                        variant={canAccess || !isPremium ? 'default' : 'secondary'}
                        asChild
                      >
                        <Link to={`/live/${stream.id}`}>
                          {isPremium && !canAccess ? (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              S'abonner
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Regarder
                            </>
                          )}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Lives à venir */}
              {upcomingLives.map((stream) => {
                const creatorInfo = creatorInfos[stream.creator_id];
                const isPremium = stream.is_premium;
                const canAccess = hasAccess(stream);

                return (
                  <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow opacity-90">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={stream.thumbnail_url || '/placeholder.svg'}
                        alt={stream.title}
                        className={`w-full h-full object-cover ${
                          isPremium && !canAccess ? 'blur-md' : ''
                        }`}
                      />
                      
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {stream.scheduled_at ? format(new Date(stream.scheduled_at), 'dd/MM HH:mm', { locale: fr }) : 'Bientôt'}
                        </Badge>
                        {stream.scheduled_at && (
                          <LiveTimer scheduledAt={stream.scheduled_at} compact />
                        )}
                      </div>
                    </div>

                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={creatorInfo?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {(creatorInfo?.stage_name || creatorInfo?.display_name || 'C').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm line-clamp-1">{stream.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {creatorInfo?.stage_name || creatorInfo?.display_name || 'Créateur'}
                          {isPremium && <span className="ml-1">• {stream.price}€</span>}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        {/* Active Creators Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Créateurs les plus actifs</h2>
          </div>
          
          {creatorsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : activeCreators && activeCreators.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {activeCreators.map((creator) => (
                <Link
                  key={creator.id}
                  to={creator.profile?.username ? `/${creator.profile.username}` : '#'}
                  className="group"
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] h-full">
                    <CardContent className="p-4 flex flex-col items-center text-center">
                      <Avatar className="h-16 w-16 mb-3 border-2 border-primary/20 group-hover:border-primary transition-colors">
                        <AvatarImage src={creator.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-lg bg-primary/10">
                          {(creator.stage_name || creator.profile?.display_name || 'C').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {creator.stage_name || creator.profile?.display_name || creator.profile?.username || 'Créateur'}
                      </h3>
                      {creator.profile?.username && (
                        <p className="text-sm text-muted-foreground">@{creator.profile.username}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{creator.total_content || 0} contenus</span>
                        <span>{creator.total_subscribers || 0} abonnés</span>
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        {creator.subscription_price > 0 ? `${creator.subscription_price}€/mois` : 'Gratuit'}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucun créateur pour le moment
              </CardContent>
            </Card>
          )}
          
          <div className="text-center mt-6">
            <Button asChild variant="outline">
              <Link to="/search">Voir tous les créateurs</Link>
            </Button>
          </div>
        </div>

        {/* My Subscriptions Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            Mes abonnements
          </h2>
          <p className="text-muted-foreground mt-1">
            Les créateurs auxquels vous êtes abonné
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : subscriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Crown className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun abonnement</h3>
              <p className="text-muted-foreground text-center mb-4">
                Vous n'êtes abonné à aucun créateur pour le moment.
              </p>
              <Button asChild>
                <Link to="/search">Découvrir des créateurs</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active Subscriptions */}
            {activeSubscriptions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">Actifs</Badge>
                  <span>{activeSubscriptions.length} abonnement{activeSubscriptions.length > 1 ? 's' : ''}</span>
                </h2>
                <div className="grid gap-4">
                  {activeSubscriptions.map((sub) => (
                    <SubscriptionCard key={sub.id} subscription={sub} />
                  ))}
                </div>
              </div>
            )}

            {/* Expired Subscriptions */}
            {expiredSubscriptions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="secondary">Expirés</Badge>
                  <span>{expiredSubscriptions.length} abonnement{expiredSubscriptions.length > 1 ? 's' : ''}</span>
                </h2>
                <div className="grid gap-4">
                  {expiredSubscriptions.map((sub) => (
                    <SubscriptionCard key={sub.id} subscription={sub} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SubscriptionCard = ({ subscription }: { subscription: Subscription }) => {
  const [isManaging, setIsManaging] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const creator = subscription.creator;
  const profile = creator.profile;
  const displayName = creator.stage_name || profile?.display_name || profile?.username || 'Créateur';
  const username = profile?.username;

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(error.message || 'Impossible d\'ouvrir le portail de gestion');
    } finally {
      setIsManaging(false);
    }
  };

  const handleResubscribe = () => {
    if (creator.subscription_price <= 0) {
      toast.info('Ce créateur propose un abonnement gratuit');
      return;
    }
    setShowCheckout(true);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Link to={username ? `/${username}` : '#'}>
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-lg bg-primary/10">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div className="flex-1 min-w-0">
              <Link 
                to={username ? `/${username}` : '#'}
                className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
              >
                {displayName}
              </Link>
              {username && (
                <p className="text-sm text-muted-foreground">@{username}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Depuis {format(new Date(subscription.start_date), 'dd MMM yyyy', { locale: fr })}
                </span>
                {subscription.end_date && subscription.status === 'active' && (
                  <span className="flex items-center gap-1 text-primary">
                    Renouvellement : {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: fr })}
                  </span>
                )}
                {subscription.end_date && subscription.status !== 'active' && (
                  <span className="flex items-center gap-1 text-destructive">
                    Expiré le {format(new Date(subscription.end_date), 'dd MMM yyyy', { locale: fr })}
                  </span>
                )}
                <span className="font-medium text-foreground">
                  {creator.subscription_price}€/mois
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status === 'active' ? 'Actif' : 'Expiré'}
              </Badge>
              {subscription.status === 'active' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleManageSubscription}
                  disabled={isManaging}
                >
                  {isManaging ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-1" />
                      Gérer
                    </>
                  )}
                </Button>
              )}
              {subscription.status !== 'active' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleResubscribe}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Se réabonner
                </Button>
              )}
              {username && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/${username}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Se réabonner à {displayName}</DialogTitle>
          </DialogHeader>
          <EmbeddedCheckout 
            creatorId={creator.id} 
            onClose={() => {
              setShowCheckout(false);
              window.location.reload();
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MySubscriptions;
