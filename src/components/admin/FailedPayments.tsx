import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, XCircle, RefreshCw, Loader2, Ban, RotateCcw, Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FailedIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  customer_email: string | null;
  description: string | null;
  error_code: string | null;
  error_message: string | null;
  error_type: string | null;
  decline_code: string | null;
}

interface ProblematicCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  disputed: boolean;
  refunded: boolean;
  refund_amount: number;
  created: string;
  customer_email: string | null;
  description: string | null;
  failure_code: string | null;
  failure_message: string | null;
}

const FailedPayments: React.FC = () => {
  const [failedIntents, setFailedIntents] = useState<FailedIntent[]>([]);
  const [problematicCharges, setProblematicCharges] = useState<ProblematicCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; charge: ProblematicCharge | null }>({
    open: false,
    charge: null,
  });
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('requested_by_customer');
  const [isRefunding, setIsRefunding] = useState(false);

  useEffect(() => {
    loadFailedPayments();
  }, []);

  const loadFailedPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-failed-payments');
      
      if (error) throw error;
      
      if (data.success) {
        setFailedIntents(data.failed_intents || []);
        setProblematicCharges(data.problematic_charges || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Erreur chargement paiements:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundDialog.charge) return;

    setIsRefunding(true);
    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      
      const { data, error } = await supabase.functions.invoke('admin-refund-payment', {
        body: {
          charge_id: refundDialog.charge.id,
          amount,
          reason: refundReason,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Remboursement de ${data.refund.amount} ${data.refund.currency.toUpperCase()} effectué`);
        setRefundDialog({ open: false, charge: null });
        setRefundAmount('');
        loadFailedPayments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Erreur remboursement:', error);
      toast.error(error.message || 'Erreur lors du remboursement');
    } finally {
      setIsRefunding(false);
    }
  };

  const openRefundDialog = (charge: ProblematicCharge) => {
    setRefundDialog({ open: true, charge });
    setRefundAmount('');
    setRefundReason('requested_by_customer');
  };

  const getStatusBadge = (status: string, disputed?: boolean, refunded?: boolean) => {
    if (disputed) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Contesté</Badge>;
    }
    if (refunded) {
      return <Badge variant="secondary" className="gap-1"><RotateCcw className="h-3 w-3" /> Remboursé</Badge>;
    }
    
    const statusMap: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline' }> = {
      'canceled': { label: 'Annulé', variant: 'secondary' },
      'requires_payment_method': { label: 'Échec carte', variant: 'destructive' },
      'requires_action': { label: 'Action requise', variant: 'outline' },
      'failed': { label: 'Échoué', variant: 'destructive' },
    };
    
    const config = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalFailedAmount = failedIntents.reduce((sum, pi) => sum + pi.amount, 0);
  const totalRefundedAmount = problematicCharges
    .filter(ch => ch.refunded)
    .reduce((sum, ch) => sum + ch.refund_amount, 0);
  const totalDisputedAmount = problematicCharges
    .filter(ch => ch.disputed)
    .reduce((sum, ch) => sum + ch.amount, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <XCircle className="h-6 w-6 text-destructive" />
            Paiements problématiques
          </h2>
          <p className="text-muted-foreground mt-1">
            Suivi des paiements échoués, remboursés et contestés
          </p>
        </div>
        <Button variant="outline" onClick={loadFailedPayments} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Paiements échoués
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {failedIntents.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalFailedAmount)} non encaissés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              Remboursements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {problematicCharges.filter(ch => ch.refunded).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalRefundedAmount)} remboursés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Contestations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {problematicCharges.filter(ch => ch.disputed).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalDisputedAmount)} contestés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="failed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="failed" className="gap-2">
            <Ban className="h-4 w-4" />
            Échecs ({failedIntents.length})
          </TabsTrigger>
          <TabsTrigger value="refunds" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Remboursements/Contestations ({problematicCharges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Paiements échoués</CardTitle>
              <CardDescription>
                Tentatives de paiement qui n'ont pas abouti
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failedIntents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  Aucun paiement échoué récent
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Erreur</TableHead>
                      <TableHead>Code déclin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedIntents.map((intent) => (
                      <TableRow key={intent.id}>
                        <TableCell className="text-sm">
                          {new Date(intent.created).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {intent.customer_email || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: intent.currency,
                          }).format(intent.amount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(intent.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {intent.error_message || '-'}
                        </TableCell>
                        <TableCell>
                          {intent.decline_code ? (
                            <Badge variant="outline" className="text-xs">
                              {intent.decline_code}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds">
          <Card>
            <CardHeader>
              <CardTitle>Remboursements & Contestations</CardTitle>
              <CardDescription>
                Paiements remboursés ou contestés par les clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {problematicCharges.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  Aucun remboursement ou contestation récent
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Remboursé</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problematicCharges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell className="text-sm">
                          {new Date(charge.created).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          {charge.customer_email || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: charge.currency,
                          }).format(charge.amount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(charge.status, charge.disputed, charge.refunded)}
                        </TableCell>
                        <TableCell>
                          {charge.refunded ? (
                            <span className="text-amber-600 font-medium">
                              {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: charge.currency,
                              }).format(charge.refund_amount)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {!charge.refunded && !charge.disputed && charge.status === 'succeeded' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRefundDialog(charge)}
                              className="gap-1"
                            >
                              <Undo2 className="h-3 w-3" />
                              Rembourser
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog({ open, charge: refundDialog.charge })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rembourser le paiement</DialogTitle>
            <DialogDescription>
              {refundDialog.charge && (
                <>
                  Client: {refundDialog.charge.customer_email || 'Non renseigné'}<br />
                  Montant total: {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: refundDialog.charge.currency,
                  }).format(refundDialog.charge.amount)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Montant à rembourser (laisser vide pour remboursement total)</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                min="0"
                max={refundDialog.charge?.amount}
                placeholder={refundDialog.charge?.amount.toString()}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Raison du remboursement</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested_by_customer">Demandé par le client</SelectItem>
                  <SelectItem value="duplicate">Paiement en double</SelectItem>
                  <SelectItem value="fraudulent">Frauduleux</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog({ open: false, charge: null })}>
              Annuler
            </Button>
            <Button onClick={handleRefund} disabled={isRefunding} variant="destructive">
              {isRefunding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Remboursement...
                </>
              ) : (
                'Confirmer le remboursement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FailedPayments;
