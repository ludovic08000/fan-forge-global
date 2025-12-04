import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

const MySubscriptions = () => {
  const { user, loading } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptions();
  }, [user]);

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

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            Mes abonnements
          </h1>
          <p className="text-muted-foreground mt-2">
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
                <div className="grid gap-4 opacity-60">
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
  const creator = subscription.creator;
  const profile = creator.profile;
  const displayName = creator.stage_name || profile?.display_name || profile?.username || 'Créateur';
  const username = profile?.username;

  return (
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
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Depuis {format(new Date(subscription.start_date), 'dd MMM yyyy', { locale: fr })}
              </span>
              <span className="font-medium text-foreground">
                {subscription.price}€/mois
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
              {subscription.status === 'active' ? 'Actif' : 'Expiré'}
            </Badge>
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
  );
};

export default MySubscriptions;
