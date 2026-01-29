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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DollarSign, TrendingUp, Calendar, Wallet, Loader2, ArrowDownToLine, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Commission {
  id: string;
  creator_id: string;
  period_start: string;
  period_end: string;
  subscription_revenue: number;
  tips_revenue: number;
  live_revenue: number;
  private_content_revenue: number;
  total_revenue: number;
  commission_rate: number;
  commission_amount: number;
  creator_payout: number;
  currency: string;
  created_at: string;
  creators: {
    stage_name: string;
    user_id: string;
  };
}

interface PlatformBalance {
  balance: number;
  pending: number;
  currency: string;
}

const PlatformCommissions: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'all'>('month');
  const [platformBalance, setPlatformBalance] = useState<PlatformBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    loadCommissions();
    loadPlatformBalance();
  }, [period]);

  const loadPlatformBalance = async () => {
    setBalanceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('platform-payout', {
        body: { action: 'balance' }
      });
      
      if (error) throw error;
      if (data.success) {
        setPlatformBalance({
          balance: data.balance,
          pending: data.pending,
          currency: data.currency
        });
      }
    } catch (error) {
      console.error('Erreur chargement solde:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handlePayout = async () => {
    setPayoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('platform-payout', {
        body: { action: 'payout' }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Payout de ${data.payout.amount}€ initié avec succès!`, {
          description: `Arrivée prévue: ${data.payout.arrival_date ? new Date(data.payout.arrival_date).toLocaleDateString() : 'Sous 2-3 jours'}`
        });
        // Recharger le solde
        loadPlatformBalance();
      } else {
        toast.error(data.error || 'Erreur lors du payout');
      }
    } catch (error: any) {
      console.error('Erreur payout:', error);
      toast.error(error.message || 'Erreur lors du retrait');
    } finally {
      setPayoutLoading(false);
    }
  };
    setLoading(true);
    try {
      let query = supabase
        .from('platform_commissions')
        .select(`
          *,
          creators:creator_id (
            stage_name,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      // Filtrer par période si nécessaire
      if (period !== 'all') {
        const now = new Date();
        let startDate: Date;

        if (period === 'week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      console.error('Erreur chargement commissions:', error);
      toast.error('Erreur lors du chargement des commissions');
    } finally {
      setLoading(false);
    }
  };

  const totalCommissions = commissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const totalRevenue = commissions.reduce((sum, c) => sum + c.total_revenue, 0);
  const totalPayouts = commissions.reduce((sum, c) => sum + c.creator_payout, 0);
  const avgCommissionRate = commissions.length > 0
    ? commissions.reduce((sum, c) => sum + c.commission_rate, 0) / commissions.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtre */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Commissions de la plateforme
          </h2>
          <p className="text-muted-foreground mt-1">
            Suivi des commissions prélevées sur les revenus créateurs
          </p>
        </div>

        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">Ce trimestre</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Carte de retrait des commissions */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Solde disponible Stripe</h3>
                {balanceLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </div>
                ) : platformBalance ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-emerald-600">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(platformBalance.balance)}
                    </p>
                    {platformBalance.pending > 0 && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(platformBalance.pending)} en attente
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Impossible de charger le solde</p>
                )}
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="lg" 
                  className="gap-2"
                  disabled={!platformBalance || platformBalance.balance <= 0 || payoutLoading}
                >
                  {payoutLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4" />
                  )}
                  Retirer les fonds
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer le retrait</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vous êtes sur le point de transférer{' '}
                    <span className="font-bold text-foreground">
                      {platformBalance && new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(platformBalance.balance)}
                    </span>{' '}
                    vers votre compte bancaire lié à Stripe.
                    <br /><br />
                    Le virement sera effectué sous 2-3 jours ouvrés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePayout}>
                    Confirmer le retrait
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalCommissions)}
            </div>
            <p className="text-xs text-muted-foreground">Revenus plateforme</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenus créateurs brut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Avant commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Versements créateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalPayouts)}
            </div>
            <p className="text-xs text-muted-foreground">Après commission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taux moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(avgCommissionRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Commission moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Table des commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des commissions</CardTitle>
          <CardDescription>
            Détail de chaque commission prélevée par période et créateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune commission pour cette période
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Créateur</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Abonnements</TableHead>
                  <TableHead className="text-right">Pourboires</TableHead>
                  <TableHead className="text-right">Lives</TableHead>
                  <TableHead className="text-right">Contenu privé</TableHead>
                  <TableHead className="text-right">Total brut</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Versé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">
                      {commission.creators.stage_name || 'Sans nom'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(commission.period_start).toLocaleDateString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(commission.period_end).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: commission.currency,
                      }).format(commission.subscription_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-600">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: commission.currency,
                      }).format(commission.tips_revenue)}
                      <div className="text-xs text-muted-foreground">0% comm.</div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: commission.currency,
                      }).format(commission.live_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: commission.currency,
                      }).format(commission.private_content_revenue)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: commission.currency,
                      }).format(commission.total_revenue)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(commission.commission_rate * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: commission.currency,
                      }).format(commission.commission_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: commission.currency,
                      }).format(commission.creator_payout)}
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

export default PlatformCommissions;