import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Banknote, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface CreatorPayment {
  id: string;
  user_id: string;
  stage_name: string;
  bank_iban: string;
  bank_bic: string;
  bank_account_holder: string;
  bank_country: string;
  payment_frequency: string;
  currency: string;
  total_subscribers: number;
  monthly_revenue: number;
  weekly_revenue: number;
  quarterly_revenue: number;
  display_name: string;
  email: string;
}

const CreatorPayments: React.FC = () => {
  const [creators, setCreators] = useState<CreatorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    loadCreatorPayments();
  }, [period]);

  const loadCreatorPayments = async () => {
    setLoading(true);
    try {
      // Calculer les dates selon la période
      const now = new Date();
      let startDate: Date;
      
      if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // Trimestre
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
      }

      // Récupérer tous les créateurs avec leurs infos bancaires
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select(`
          id,
          user_id,
          stage_name,
          bank_iban,
          bank_bic,
          bank_account_holder,
          bank_country,
          payment_frequency,
          currency,
          total_subscribers
        `)
        .not('bank_iban', 'is', null)
        .order('stage_name');

      if (creatorsError) throw creatorsError;

      // Pour chaque créateur, calculer les revenus de la période
      const creatorsWithRevenue = await Promise.all(
        (creatorsData || []).map(async (creator) => {
          // Calculer les revenus de la période actuelle
          const { data: revenueData, error: revenueError } = await supabase
            .rpc('calculate_creator_total_revenue', {
              creator_uuid: creator.id,
              start_date: startDate.toISOString(),
              end_date: now.toISOString(),
            });

          const currentRevenue = revenueData || 0;

          // Récupérer les infos du profil
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', creator.user_id)
            .single();

          // Récupérer l'email
          const { data: { user } } = await supabase.auth.admin.getUserById(creator.user_id);

          return {
            ...creator,
            monthly_revenue: period === 'month' ? currentRevenue : 0,
            weekly_revenue: period === 'week' ? currentRevenue : 0,
            quarterly_revenue: period === 'quarter' ? currentRevenue : 0,
            display_name: profile?.display_name || '',
            email: user?.email || '',
          };
        })
      );

      setCreators(creatorsWithRevenue as CreatorPayment[]);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      toast.error('Erreur lors du chargement des données de paiement');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Nom de scène',
      'Titulaire du compte',
      'IBAN',
      'BIC',
      'Pays',
      'Fréquence paiement',
      'Revenus période',
      'Devise',
      'Abonnés',
    ];

    const rows = creators.map((c) => [
      c.stage_name || 'N/A',
      c.bank_account_holder || 'N/A',
      c.bank_iban || 'N/A',
      c.bank_bic || 'N/A',
      c.bank_country || 'N/A',
      c.payment_frequency === 'weekly' ? 'Hebdomadaire' : 
        c.payment_frequency === 'monthly' ? 'Mensuel' : 'Trimestriel',
      period === 'week' ? c.weekly_revenue :
        period === 'month' ? c.monthly_revenue : c.quarterly_revenue,
      c.currency,
      c.total_subscribers,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `paiements_createurs_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Export CSV téléchargé');
  };

  const formatIBAN = (iban: string) => {
    if (!iban) return 'N/A';
    // Masquer une partie de l'IBAN pour la sécurité
    const length = iban.length;
    if (length <= 8) return iban;
    return iban.substring(0, 4) + '****' + iban.substring(length - 4);
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, "default" | "secondary" | "outline"> = {
      weekly: 'secondary',
      monthly: 'default',
      quarterly: 'outline',
    };
    return colors[frequency] || 'default';
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
    };
    return labels[frequency] || frequency;
  };

  const getCurrentRevenue = (creator: CreatorPayment) => {
    if (period === 'week') return creator.weekly_revenue;
    if (period === 'month') return creator.monthly_revenue;
    return creator.quarterly_revenue;
  };

  const totalRevenue = creators.reduce((sum, c) => sum + getCurrentRevenue(c), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" />
            Paiements créateurs
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez les rémunérations des créateurs avec leurs coordonnées bancaires
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total créateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creators.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Revenus totaux ({period === 'week' ? 'semaine' : period === 'month' ? 'mois' : 'trimestre'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abonnés totaux</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {creators.reduce((sum, c) => sum + c.total_subscribers, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table des paiements */}
      <Card>
        <CardHeader>
          <CardTitle>Détails des paiements</CardTitle>
          <CardDescription>
            Coordonnées bancaires et revenus pour chaque créateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Créateur</TableHead>
                <TableHead>Titulaire</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>BIC</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Fréquence</TableHead>
                <TableHead>Abonnés</TableHead>
                <TableHead className="text-right">Revenus période</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.map((creator) => (
                <TableRow key={creator.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{creator.stage_name || 'Sans nom'}</div>
                      <div className="text-xs text-muted-foreground">
                        {creator.display_name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {creator.bank_account_holder || 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatIBAN(creator.bank_iban)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {creator.bank_bic || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{creator.bank_country || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getFrequencyBadge(creator.payment_frequency)}>
                      {getFrequencyLabel(creator.payment_frequency)}
                    </Badge>
                  </TableCell>
                  <TableCell>{creator.total_subscribers}</TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: creator.currency,
                    }).format(getCurrentRevenue(creator))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {creators.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun créateur avec IBAN configuré
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorPayments;