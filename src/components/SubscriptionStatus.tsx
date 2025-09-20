import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Calendar, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

const SubscriptionStatus: React.FC = () => {
  const { 
    subscriptionStatus,
    isSubscribed,
    currentPlan,
    isExpiringSoon,
    expirationDate,
    openCustomerPortal,
    refreshSubscription,
    isOpeningPortal,
    isLoading
  } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Vérification de l'abonnement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isSubscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-muted-foreground" />
            <span>Abonnement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <Badge variant="outline">Plan Gratuit</Badge>
            <p className="text-sm text-muted-foreground">
              Passez à un plan payant pour débloquer toutes les fonctionnalités
            </p>
          </div>
          
          <Button 
            variant="premium" 
            className="w-full"
            onClick={() => window.location.href = '/dashboard?tab=subscription'}
          >
            Voir les plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-primary" />
            <span>Mon Abonnement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge className="mb-2">{currentPlan}</Badge>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {expirationDate ? `Expire le ${expirationDate}` : 'Abonnement actif'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCustomerPortal()}
              disabled={isOpeningPortal}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isOpeningPortal ? 'Ouverture...' : 'Gérer'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">∞</div>
              <div className="text-xs text-muted-foreground">Uploads</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-500">✓</div>
              <div className="text-xs text-muted-foreground">Analytics</div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => refreshSubscription()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser le statut
          </Button>
        </CardContent>
      </Card>

      {/* Alert si expiration prochaine */}
      {isExpiringSoon && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Votre abonnement expire bientôt ({expirationDate}). 
            Gérez votre abonnement pour éviter toute interruption de service.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SubscriptionStatus;