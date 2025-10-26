import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Banknote, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentRequest {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  error_message: string | null;
  creators: {
    stage_name: string;
    bank_account_holder: string;
    bank_iban: string;
    bank_bic: string;
    bank_country: string;
  };
}

const PaymentRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creator_payment_requests')
        .select(`
          *,
          creators:creator_id (
            stage_name,
            bank_account_holder,
            bank_iban,
            bank_bic,
            bank_country
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async (requestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir traiter ce paiement ?')) return;

    setProcessing(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('process-creator-payment', {
        body: { requestId },
      });

      if (error) throw error;

      toast.success(data.message || 'Paiement traité avec succès');
      loadRequests();
    } catch (error: any) {
      console.error('Erreur traitement paiement:', error);
      toast.error(error.message || 'Erreur lors du traitement du paiement');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelPayment = async (requestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return;

    try {
      const { error } = await supabase
        .from('creator_payment_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Demande annulée');
      loadRequests();
    } catch (error) {
      console.error('Erreur annulation:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default">
            <AlertCircle className="h-3 w-3 mr-1" />
            En traitement
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complété
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Échoué
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            Annulé
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatIBAN = (iban: string) => {
    if (!iban) return 'N/A';
    const length = iban.length;
    if (length <= 8) return iban;
    return iban.substring(0, 4) + '****' + iban.substring(length - 4);
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">demandes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalPendingAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total demandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-muted-foreground">toutes périodes</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Demandes de paiement créateurs
          </CardTitle>
          <CardDescription>
            Gérez et traitez les demandes de paiement des créateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune demande de paiement
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Créateur</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>IBAN</TableHead>
                  <TableHead>BIC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date demande</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.creators.stage_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.creators.bank_account_holder}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: request.currency,
                      }).format(request.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(request.period_start).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">
                          {new Date(request.period_end).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatIBAN(request.creators.bank_iban)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {request.creators.bank_bic}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleProcessPayment(request.id)}
                              disabled={processing === request.id}
                            >
                              {processing === request.id ? 'Traitement...' : 'Traiter'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelPayment(request.id)}
                            >
                              Annuler
                            </Button>
                          </>
                        )}
                        {request.status === 'failed' && request.error_message && (
                          <div className="text-xs text-destructive">
                            {request.error_message}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentRequestsManager;