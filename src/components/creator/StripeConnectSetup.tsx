import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface StripeConnectStatus {
  connected: boolean;
  status: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}

const StripeConnectSetup: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-connect-status');

      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error('Erreur vérification statut:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');

      if (error) throw error;

      if (data.onboarding_url) {
        // Ouvrir l'onboarding Stripe dans un nouvel onglet
        window.open(data.onboarding_url, '_blank');
        toast.success('Onboarding Stripe ouvert - Complétez votre inscription');
      }
    } catch (error: any) {
      console.error('Erreur connexion Stripe:', error);
      toast.error(error.message || 'Erreur lors de la connexion à Stripe');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!status || !status.connected) {
      return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Non connecté</Badge>;
    }
    if (status.status === 'active' && status.payouts_enabled) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>;
    }
    if (status.status === 'pending') {
      return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />En attente</Badge>;
    }
    return <Badge variant="outline">{status.status}</Badge>;
  };

  if (checking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Stripe Connect</span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Connectez votre compte Stripe pour recevoir vos paiements automatiquement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.connected || status.status !== 'active' ? (
          <>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Pourquoi Stripe Connect ?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Virements automatiques vers votre compte bancaire</li>
                <li>✓ Sécurisé et conforme aux normes bancaires</li>
                <li>✓ Suivi de vos revenus en temps réel</li>
                <li>✓ Pas besoin de partager votre IBAN</li>
              </ul>
            </div>

            {status?.connected && status.status === 'pending' && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ Votre compte Stripe est en cours de configuration. Complétez l'onboarding pour activer les paiements.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleConnectStripe}
                disabled={loading}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  'Connexion...'
                ) : status?.connected ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Compléter l'onboarding
                  </>
                ) : (
                  'Connecter Stripe Connect'
                )}
              </Button>
              <Button
                onClick={checkStatus}
                variant="outline"
                size="lg"
                disabled={checking}
              >
                <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm text-green-600 dark:text-green-400">
                    Compte Stripe Connect actif
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vos paiements seront transférés automatiquement vers votre compte bancaire.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paiements activés</span>
                <span className="font-medium">
                  {status.charges_enabled ? '✓ Oui' : '✗ Non'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Virements activés</span>
                <span className="font-medium">
                  {status.payouts_enabled ? '✓ Oui' : '✗ Non'}
                </span>
              </div>
            </div>

            <Button
              onClick={checkStatus}
              variant="outline"
              className="w-full"
              disabled={checking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Vérifier le statut
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StripeConnectSetup;