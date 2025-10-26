import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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

const PaymentRequest: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [availableRevenue, setAvailableRevenue] = useState(0);
  const [creatorInfo, setCreatorInfo] = useState<any>(null);

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

      const { data: revenue } = await supabase.rpc('calculate_creator_total_revenue', {
        creator_uuid: creator.id,
        start_date: periodStart.toISOString(),
        end_date: now.toISOString(),
      });

      setAvailableRevenue(revenue || 0);
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

    if (!creatorInfo.bank_iban || !creatorInfo.bank_bic) {
      toast.error('Veuillez configurer vos informations bancaires dans les paramètres');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-creator-payment');

      if (error) throw error;

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
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Revenu disponible</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: creatorInfo.currency || 'EUR',
                    }).format(availableRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fréquence de paiement: {getFrequencyLabel(creatorInfo.payment_frequency)}
                  </p>
                </div>
                <Button
                  onClick={handleRequestPayment}
                  disabled={loading || availableRevenue <= 0}
                  size="lg"
                >
                  {loading ? 'Traitement...' : 'Demander le paiement'}
                </Button>
              </div>

              {(!creatorInfo.bank_iban || !creatorInfo.bank_bic) && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ Configurez vos informations bancaires dans les paramètres pour recevoir vos paiements
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