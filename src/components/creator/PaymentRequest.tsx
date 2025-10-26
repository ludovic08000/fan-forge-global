import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, Clock, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  error_message: string | null;
}

interface RevenueBreakdown {
  subscription_revenue: number;
  tips_revenue: number;
  live_revenue: number;
  private_content_revenue: number;
  total_before_commission: number;
  commission_amount: number;
  total_after_commission: number;
}

const PaymentRequest: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    if (user) {
      loadPaymentRequests();
      loadCreatorInfo();
    }
  }, [user]);

  const loadCreatorInfo = async () => {
    if (!user) return;

    try {
      const { data: creator, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCreatorInfo(creator);

      // Vérifier le statut Stripe Connect (maintenant mis à jour par check-stripe-connect-status)
      setStripeConnected(
        creator.stripe_account_id && 
        creator.stripe_onboarding_completed && 
        creator.stripe_payouts_enabled
      );

      console.log('✅ Creator info loaded:', {
        stripe_account_id: creator.stripe_account_id,
        stripe_onboarding_completed: creator.stripe_onboarding_completed,
        stripe_payouts_enabled: creator.stripe_payouts_enabled,
        stripeConnected: creator.stripe_account_id && creator.stripe_onboarding_completed && creator.stripe_payouts_enabled
      });

      // Calculer le revenu disponible
      const now = new Date();
      let periodStart: Date;

      if (creator.payment_frequency === 'weekly') {
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (creator.payment_frequency === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      }

      const { data: revenue } = await supabase.rpc('calculate_creator_revenue_with_commission', {
        creator_uuid: creator.id,
        start_date: periodStart.toISOString(),
        end_date: now.toISOString(),
      });

      if (revenue && revenue.length > 0) {
        setRevenueBreakdown(revenue[0]);
        console.log('💰 Revenue breakdown:', revenue[0]);
      }
    } catch (error) {
      console.error('Erreur chargement créateur:', error);
    }
  };

  const loadPaymentRequests = async () => {
    if (!user) return;

    try {
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!creator) return;

      const { data, error } = await supabase
        .from('creator_payment_requests')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    }
  };

  const handleRequestPayment = async () => {
    if (!creatorInfo) {
      toast.error('Profil créateur non trouvé');
      return;
    }

    if (!stripeConnected) {
      toast.error("Veuillez d'abord connecter votre compte Stripe Connect");
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Requesting payment...');
      const { data, error } = await supabase.functions.invoke('request-creator-payment');

      if (error) {
        console.error('❌ Payment request error:', error);
        throw error;
      }

      console.log('✅ Payment request success:', data);
      toast.success(data.message);
      loadPaymentRequests();
      loadCreatorInfo();
    } catch (error: any) {
      console.error('Erreur demande paiement:', error);
      toast.error(error.message || 'Erreur lors de la demande de paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');
      if (error) throw error;
      if (data?.onboarding_url) {
        window.open(data.onboarding_url, '_blank');
        toast.success("Onboarding Stripe ouvert - complétez votre inscription");
      }
    } catch (e: any) {
      console.error('Erreur connexion Stripe:', e);
      if (e.message?.includes('permissions')) {
        toast.error("Configuration Stripe incorrecte - contactez le support");
      } else {
        toast.error(e.message || "Erreur lors de l'ouverture de Stripe Connect");
      }
    }
  };

  const handleOpenStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-login-link');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Ouverture du tableau de bord Stripe');
      } else {
        toast.error('Lien Stripe indisponible');
      }
    } catch (e: any) {
      console.error('Erreur ouverture Stripe:', e);
      toast.error(e.message || "Impossible d'ouvrir Stripe");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'processing':
        return <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" />En traitement</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Complété</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Échoué</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Annulé</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return 'hebdomadaire';
      case 'monthly':
        return 'mensuel';
      case 'quarterly':
        return 'trimestriel';
      default:
        return frequency;
    }
  };

  return (
    <div className="space-y-6">
      {/* Carte de demande de paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Demander un paiement
          </CardTitle>
          <CardDescription>
            Recevez vos revenus directement sur votre compte bancaire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {creatorInfo && (
            <div className="space-y-4">
              <div className="space-y-4">
                {/* Revenu net disponible */}
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Revenu net disponible</p>
                    <p className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: creatorInfo.currency || 'EUR',
                      }).format(revenueBreakdown?.total_after_commission || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fréquence de paiement: {getFrequencyLabel(creatorInfo.payment_frequency)}
                    </p>
                  </div>
                  <Button
                    onClick={handleRequestPayment}
                    disabled={loading || !revenueBreakdown || revenueBreakdown.total_after_commission <= 0 || !stripeConnected}
                    size="lg"
                  >
                    {loading ? 'Traitement...' : 'Demander le paiement'}
                  </Button>
                </div>

                {stripeConnected && (
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={handleOpenStripe} className="gap-2">
                      <ExternalLink className="h-4 w-4" /> Ouvrir Stripe
                    </Button>
                  </div>
                )}

                {!stripeConnected && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-3">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      ⚠️ Connectez votre compte Stripe Connect pour recevoir vos paiements automatiquement
                    </p>
                    <div>
                      <Button onClick={handleConnectStripe}>
                        Configurer Stripe Connect
                      </Button>
                    </div>
                  </div>
                )}

                {/* Détail des revenus */}
                {revenueBreakdown && (
                  <div className="p-4 border rounded-lg space-y-2 bg-card">
                    <h4 className="font-medium text-sm mb-3">Détail des revenus</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Abonnements</span>
                        <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: creatorInfo.currency }).format(revenueBreakdown.subscription_revenue)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Pourboires (sans commission)</span>
                        <span className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: creatorInfo.currency }).format(revenueBreakdown.tips_revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lives</span>
                        <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: creatorInfo.currency }).format(revenueBreakdown.live_revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contenu privé</span>
                        <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: creatorInfo.currency }).format(revenueBreakdown.private_content_revenue)}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total brut</span>
                          <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: creatorInfo.currency }).format(revenueBreakdown.total_before_commission)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Commission plateforme (15%)</span>
                        <span>-{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: creatorInfo.currency }).format(revenueBreakdown.commission_amount)}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg text-green-600">
                          <span>Vous recevrez</span>
                          <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: creatorInfo.currency }).format(revenueBreakdown.total_after_commission)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                      💡 Les pourboires sont versés à 100% (sans commission)
                    </p>
                  </div>
                )}
              </div>

              {(!creatorInfo.bank_iban || !creatorInfo.bank_bic) && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    💡 Avec Stripe Connect, vous n'avez plus besoin de renseigner votre IBAN. Les virements sont automatiques et sécurisés.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historique des demandes */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
          <CardDescription>
            Suivez l'état de vos demandes de paiement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune demande de paiement
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: request.currency,
                        }).format(request.amount)}
                      </p>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Période: {new Date(request.period_start).toLocaleDateString()} - {new Date(request.period_end).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Demandé le {new Date(request.requested_at).toLocaleDateString()}
                      {request.processed_at && ` • Traité le ${new Date(request.processed_at).toLocaleDateString()}`}
                    </p>
                    {request.error_message && (
                      <p className="text-xs text-destructive">
                        Erreur: {request.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentRequest;