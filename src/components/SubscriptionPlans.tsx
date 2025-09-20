import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';

const SubscriptionPlans: React.FC = () => {
  const { user } = useAuth();
  const { 
    plans, 
    subscriptionStatus, 
    isSubscribed, 
    currentPlan, 
    createCheckout, 
    isCreatingCheckout,
    openCustomerPortal,
    isOpeningPortal
  } = useSubscription();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const isCurrentPlan = (planName: string) => {
    return currentPlan === planName;
  };

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      return;
    }
    
    createCheckout(priceId);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Choisissez votre plan créateur</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Débloquez tout le potentiel de votre créativité avec nos outils professionnels
        </p>
      </div>

      {/* Plan actuel */}
      {isSubscribed && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary rounded-full">
                  <Crown className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Plan actuel : {currentPlan}</h3>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionStatus?.subscription_end && (
                      `Expire le ${new Date(subscriptionStatus.subscription_end).toLocaleDateString('fr-FR')}`
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => openCustomerPortal()}
                disabled={isOpeningPortal}
              >
                {isOpeningPortal ? 'Ouverture...' : 'Gérer l\'abonnement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Plan Gratuit */}
        <Card className={`relative ${!isSubscribed ? 'border-primary bg-primary/5' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Gratuit</span>
              </CardTitle>
              {!isSubscribed && (
                <Badge variant="secondary">Actuel</Badge>
              )}
            </div>
            <CardDescription>Pour commencer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              0€<span className="text-lg font-normal text-muted-foreground">/mois</span>
            </div>
            
            <ul className="space-y-2">
              {[
                'Upload limité (5 contenus/mois)',
                'Analytics de base',
                '100 abonnés maximum',
                'Support communautaire'
              ].map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              variant="outline" 
              className="w-full"
              disabled={!isSubscribed}
            >
              {!isSubscribed ? 'Plan actuel' : 'Rétrograder'}
            </Button>
          </CardContent>
        </Card>

        {/* Plan Standard */}
        <Card className={`relative ${isCurrentPlan(plans.standard.name) ? 'border-primary bg-primary/5' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-blue-500" />
                <span>{plans.standard.name}</span>
              </CardTitle>
              {isCurrentPlan(plans.standard.name) && (
                <Badge>Actuel</Badge>
              )}
            </div>
            <CardDescription>Pour les créateurs réguliers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              {formatPrice(plans.standard.price)}
              <span className="text-lg font-normal text-muted-foreground">/mois</span>
            </div>
            
            <ul className="space-y-2">
              {plans.standard.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              variant={isCurrentPlan(plans.standard.name) ? "outline" : "default"}
              className="w-full"
              onClick={() => handleSubscribe(plans.standard.price_id)}
              disabled={isCreatingCheckout || isCurrentPlan(plans.standard.name)}
            >
              {isCreatingCheckout ? 'Redirection...' : 
               isCurrentPlan(plans.standard.name) ? 'Plan actuel' : 'Choisir Standard'}
            </Button>
          </CardContent>
        </Card>

        {/* Plan Premium */}
        <Card className={`relative ${isCurrentPlan(plans.premium.name) ? 'border-primary bg-primary/5' : 'border-primary'}`}>
          {!isCurrentPlan(plans.premium.name) && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Star className="h-3 w-3 mr-1" />
                Recommandé
              </Badge>
            </div>
          )}
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-primary" />
                <span>{plans.premium.name}</span>
              </CardTitle>
              {isCurrentPlan(plans.premium.name) && (
                <Badge>Actuel</Badge>
              )}
            </div>
            <CardDescription>Pour les professionnels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">
              {formatPrice(plans.premium.price)}
              <span className="text-lg font-normal text-muted-foreground">/mois</span>
            </div>
            
            <ul className="space-y-2">
              {plans.premium.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button 
              variant={isCurrentPlan(plans.premium.name) ? "outline" : "premium"}
              className="w-full"
              onClick={() => handleSubscribe(plans.premium.price_id)}
              disabled={isCreatingCheckout || isCurrentPlan(plans.premium.name)}
            >
              {isCreatingCheckout ? 'Redirection...' : 
               isCurrentPlan(plans.premium.name) ? 'Plan actuel' : 'Choisir Premium'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info importante */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold">Information importante</h3>
            <p className="text-sm text-muted-foreground">
              Tous les abonnements peuvent être modifiés ou annulés à tout moment depuis votre espace de gestion.
              Aucun engagement de durée minimum.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPlans;