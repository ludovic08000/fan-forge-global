import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Search } from 'lucide-react';
import { SubscriptionCard } from './SubscriptionCard';

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

interface MySubscriptionsSectionProps {
  subscriptions: Subscription[];
  isLoading: boolean;
  onUpdate: () => void;
}

export const MySubscriptionsSection = ({ subscriptions, isLoading, onUpdate }: MySubscriptionsSectionProps) => {
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const expiredSubscriptions = subscriptions.filter(s => s.status !== 'active');

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Mes abonnements</h2>
        {activeSubscriptions.length > 0 && (
          <span className="text-sm text-muted-foreground">
            ({activeSubscriptions.length} actif{activeSubscriptions.length > 1 ? 's' : ''})
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="flex flex-col items-center py-8">
            <Crown className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-center mb-4">
              Vous n'êtes abonné à aucun créateur
            </p>
            <Button asChild size="sm">
              <Link to="/search">
                <Search className="h-4 w-4 mr-1" />
                Découvrir
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Abonnements actifs */}
          {activeSubscriptions.length > 0 && (
            <div className="space-y-2">
              {activeSubscriptions.map((sub) => (
                <SubscriptionCard key={sub.id} subscription={sub} onUpdate={onUpdate} />
              ))}
            </div>
          )}

          {/* Abonnements expirés - Collapsible */}
          {expiredSubscriptions.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                {expiredSubscriptions.length} abonnement{expiredSubscriptions.length > 1 ? 's' : ''} expiré{expiredSubscriptions.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-2">
                {expiredSubscriptions.map((sub) => (
                  <SubscriptionCard key={sub.id} subscription={sub} onUpdate={onUpdate} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
};
