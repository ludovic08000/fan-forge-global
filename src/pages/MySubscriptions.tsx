import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { LiveStream } from '@/hooks/useLiveStream';
import SearchBar from '@/components/SearchBar';
import { MySubscriptionsSection } from '@/components/subscriptions/MySubscriptionsSection';
import { LiveStreamsSection } from '@/components/subscriptions/LiveStreamsSection';
import { ActiveCreatorsSection } from '@/components/subscriptions/ActiveCreatorsSection';
import { Loader2 } from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  price: number;
  currency: string;
  creator: {
    id: string;
    user_id: string;
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
  const { user, loading: authLoading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(true);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [creatorInfos, setCreatorInfos] = useState<Record<string, CreatorInfo>>({});
  const [userSubscriptionIds, setUserSubscriptionIds] = useState<string[]>([]);

  // Filtrer les lives fantômes (heartbeat > 2 minutes pour live, ou scheduled vieux sans date)
  const filterGhostLives = useCallback((streams: any[]): LiveStream[] => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return streams.filter((stream: any) => {
      // Pour les lives actifs, vérifier le heartbeat
      if (stream.status === 'live') {
        if (!stream.started_at) return false;
        if (stream.last_heartbeat) {
          const lastHeartbeat = new Date(stream.last_heartbeat);
          if (lastHeartbeat < twoMinutesAgo) return false;
        }
        return true;
      }
      
      // Pour les scheduled, exclure ceux sans scheduled_at créés il y a plus de 24h
      if (stream.status === 'scheduled') {
        // S'il a une date programmée dans le futur, le garder
        if (stream.scheduled_at) {
          const scheduledDate = new Date(stream.scheduled_at);
          return scheduledDate > new Date();
        }
        // Sinon, exclure si créé il y a plus de 24h (probablement abandonné)
        const createdAt = new Date(stream.created_at);
        return createdAt > oneDayAgo;
      }
      
      return false;
    }) as LiveStream[];
  }, []);

  // Charger les lives
  useEffect(() => {
    let isMounted = true;

    const fetchLives = async () => {
      const { data, error } = await supabase
        .from('public_live_streams')
        .select('*')
        .in('status', ['live', 'scheduled'])
        .order('created_at', { ascending: false });
      
      if (!error && data && isMounted) {
        setLiveStreams(filterGhostLives(data));
      }
    };

    fetchLives();

    // Realtime + polling
    const channel = supabase
      .channel('subscriptions-lives')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, fetchLives)
      .subscribe();

    const pollInterval = setInterval(fetchLives, 5000);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [filterGhostLives]);

  // Charger les infos créateurs pour les lives
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

  // Charger les abonnements
  const loadSubscriptions = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingSubs(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id, status, start_date, end_date, price, currency,
          creator:creators!subscriptions_creator_id_fkey (
            id, stage_name, subscription_price, user_id
          )
        `)
        .eq('subscriber_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const subscriptionsWithProfiles = await Promise.all(
        (data || []).map(async (sub: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', sub.creator.user_id)
            .single();

          return { ...sub, creator: { ...sub.creator, profile: profileData } };
        })
      );

      setSubscriptions(subscriptionsWithProfiles);
      setUserSubscriptionIds(
        subscriptionsWithProfiles.filter(s => s.status === 'active').map(s => s.creator.id)
      );
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setIsLoadingSubs(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // Vérifier accès aux lives premium
  const hasAccess = useCallback((stream: LiveStream) => {
    if (!stream.is_premium || stream.price === 0 || stream.price === null) return true;
    if (!user) return false;
    return userSubscriptionIds.includes(stream.creator_id);
  }, [user, userSubscriptionIds]);

  // Créateurs actifs
  const { data: activeCreators, isLoading: creatorsLoading } = useQuery({
    queryKey: ['active-creators'],
    queryFn: async () => {
      const { data: creators, error } = await supabase
        .from('public_creators')
        .select('id, stage_name, subscription_price, total_content, total_subscribers, user_id')
        .order('total_content', { ascending: false })
        .limit(6);

      if (error) throw error;

      const userIds = (creators || []).map(c => c.user_id).filter(Boolean) as string[];
      const { data: profiles } = await supabase
        .from('public_creator_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      return (creators || []).map(creator => ({
        ...creator,
        profile: profiles?.find(p => p.user_id === creator.user_id) || null
      }));
    }
  });

  // Loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const liveNow = liveStreams.filter(s => s.status === 'live');
  const upcomingLives = liveStreams.filter(s => s.status === 'scheduled').slice(0, 3);

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header simple */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Mon espace</h1>
          <p className="text-muted-foreground text-sm">
            Gérez vos abonnements et découvrez des créateurs
          </p>
        </div>

        {/* Barre de recherche - Plus compacte */}
        <div className="max-w-lg mx-auto mb-10">
          <SearchBar placeholder="Rechercher un créateur..." />
        </div>

        {/* Mes abonnements */}
        <MySubscriptionsSection 
          subscriptions={subscriptions}
          isLoading={isLoadingSubs}
          onUpdate={loadSubscriptions}
        />

        {/* Lives en cours */}
        <LiveStreamsSection
          liveNow={liveNow}
          upcomingLives={upcomingLives}
          creatorInfos={creatorInfos}
          hasAccess={hasAccess}
        />

        {/* Créateurs populaires */}
        <ActiveCreatorsSection
          creators={activeCreators}
          isLoading={creatorsLoading}
        />
      </div>
    </div>
  );
};

export default MySubscriptions;
