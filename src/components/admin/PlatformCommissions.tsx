import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
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

const PlatformCommissions: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'all'>('month');

  useEffect(() => {
    loadCommissions();
  }, [period]);

  const loadCommissions = async () => {
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