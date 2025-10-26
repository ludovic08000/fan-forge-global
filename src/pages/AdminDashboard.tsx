/**
 * Dashboard administrateur pour gérer les signalements de contenu et les logs de connexion
 * Affiche tous les signalements en attente et l'historique des connexions des utilisateurs
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, FileText, Users, Search, Wallet, DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';
import PaymentRequestsManager from '@/components/admin/PaymentRequestsManager';
import PlatformCommissions from '@/components/admin/PlatformCommissions';

interface ContentReport {
  id: string;
  content_id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: string;
  admin_notes: string;
  created_at: string;
  content?: {
    title: string;
    creator_id: string;
  };
}

interface LoginLog {
  id: string;
  user_id: string;
  username: string;
  email: string;
  ip_address: string;
  user_agent: string;
  login_method: string;
  created_at: string;
}

interface CreatorPayment {
  id: string;
  user_id: string;
  stage_name: string;
  email: string;
  bank_account_holder: string;
  bank_iban: string;
  bank_bic: string;
  bank_country: string;
  payment_frequency: string;
  currency: string;
  weekly_revenue: number;
  monthly_revenue: number;
  quarterly_revenue: number;
  total_subscribers: number;
}

/**
 * Page du dashboard administrateur
 */
const AdminDashboard = () => {
  const { userRole } = useAuth();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [creatorPayments, setCreatorPayments] = useState<CreatorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');

  // ⚠️ ATTENTION: Vérification du rôle admin DÉSACTIVÉE pour les tests
  // À RÉACTIVER EN PRODUCTION!
  // if (userRole !== 'admin') {
  //   return <Navigate to="/" replace />;
  // }

  /**
   * Charger les signalements
   */
  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select(`
          *,
          content:content_id (
            title,
            creator_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Erreur chargement signalements:', error);
      toast.error('Erreur lors du chargement des signalements');
    }
  };

  /**
   * Charger les logs de connexion
   */
  const loadLoginLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_login_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLoginLogs(data || []);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      toast.error('Erreur lors du chargement des logs');
    }
  };

  /**
   * Charger les informations de paiement des créateurs
   */
  const loadCreatorPayments = async () => {
    try {
      // Calculer les dates pour chaque période
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

      const { data: creators, error } = await supabase
        .from('creators')
        .select(`
          id,
          user_id,
          stage_name,
          bank_account_holder,
          bank_iban,
          bank_bic,
          bank_country,
          payment_frequency,
          currency,
          total_subscribers
        `)
        .not('bank_iban', 'is', null);

      if (error) throw error;

      // Pour chaque créateur, calculer les revenus
      const paymentsData = await Promise.all(
        (creators || []).map(async (creator: any) => {
          // Récupérer l'email de l'utilisateur
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const user = authUsers?.users.find((u: any) => u.id === creator.user_id);

          // Calculer les revenus pour chaque période
          const [weeklyRev, monthlyRev, quarterlyRev] = await Promise.all([
            supabase.rpc('calculate_creator_total_revenue', {
              creator_uuid: creator.id,
              start_date: startOfWeek.toISOString(),
              end_date: new Date().toISOString(),
            }),
            supabase.rpc('calculate_creator_total_revenue', {
              creator_uuid: creator.id,
              start_date: startOfMonth.toISOString(),
              end_date: new Date().toISOString(),
            }),
            supabase.rpc('calculate_creator_total_revenue', {
              creator_uuid: creator.id,
              start_date: startOfQuarter.toISOString(),
              end_date: new Date().toISOString(),
            }),
          ]);

          return {
            ...creator,
            email: user?.email || 'N/A',
            weekly_revenue: weeklyRev.data || 0,
            monthly_revenue: monthlyRev.data || 0,
            quarterly_revenue: quarterlyRev.data || 0,
          };
        })
      );

      setCreatorPayments(paymentsData);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      toast.error('Erreur lors du chargement des informations de paiement');
    }
  };

  /**
   * Mettre à jour le statut d'un signalement
   */
  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({ 
          status,
          admin_notes: adminNotes 
        })
        .eq('id', reportId);

      if (error) throw error;
      
      toast.success('Signalement mis à jour');
      loadReports();
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  /**
   * Obtenir la couleur du badge selon le statut
   */
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: 'destructive',
      reviewing: 'secondary',
      resolved: 'default',
      rejected: 'outline',
    };
    return variants[status] || 'default';
  };

  /**
   * Filtrer les logs par terme de recherche
   */
  const filteredLogs = loginLogs.filter((log) => {
    const search = searchTerm.toLowerCase();
    return (
      log.email?.toLowerCase().includes(search) ||
      log.username?.toLowerCase().includes(search) ||
      log.ip_address?.includes(search) ||
      log.user_id?.includes(search)
    );
  });

  /**
   * Exporter les données de paiement en CSV
   */
  const exportPaymentsToCSV = () => {
    const headers = ['Créateur', 'Email', 'IBAN', 'BIC', 'Pays', 'Fréquence', 'Devise', 'Revenu Semaine', 'Revenu Mois', 'Revenu Trimestre', 'Abonnés'];
    const rows = filteredPayments.map(p => [
      p.stage_name || 'N/A',
      p.email,
      p.bank_iban || 'N/A',
      p.bank_bic || 'N/A',
      p.bank_country || 'N/A',
      p.payment_frequency,
      p.currency,
      p.weekly_revenue.toFixed(2),
      p.monthly_revenue.toFixed(2),
      p.quarterly_revenue.toFixed(2),
      p.total_subscribers,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paiements-createurs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Export CSV téléchargé');
  };

  /**
   * Filtrer les paiements par terme de recherche
   */
  const filteredPayments = creatorPayments.filter((payment) => {
    const search = paymentSearchTerm.toLowerCase();
    return (
      payment.stage_name?.toLowerCase().includes(search) ||
      payment.email?.toLowerCase().includes(search) ||
      payment.bank_iban?.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadReports(), loadLoginLogs(), loadCreatorPayments()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* ⚠️ Bannière d'avertissement pour les tests */}
      <div className="mb-6 p-4 bg-orange-100 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg">
        <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-bold">
            MODE TEST - Sécurité désactivée! Réactiver la vérification du rôle admin en production.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Administrateur</h1>
        <p className="text-muted-foreground">
          Gestion des signalements et surveillance des connexions
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Signalements en attente
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.filter((r) => r.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total signalements
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Connexions (24h)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loginLogs.filter((log) => {
                const logDate = new Date(log.created_at);
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return logDate > yesterday;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Signalements</TabsTrigger>
          <TabsTrigger value="logs">Logs de connexion</TabsTrigger>
          <TabsTrigger value="payment-requests">Demandes de paiement</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="payments">Paiements créateurs</TabsTrigger>
        </TabsList>

        {/* Onglet Signalements */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Signalements de contenu</CardTitle>
              <CardDescription>
                Gérez les signalements de contenu inapproprié
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Contenu</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {new Date(report.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {report.content?.title || 'Contenu supprimé'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {report.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(report.status)}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setAdminNotes(report.admin_notes || '');
                          }}
                        >
                          Examiner
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Détails du signalement sélectionné */}
          {selectedReport && (
            <Card>
              <CardHeader>
                <CardTitle>Détails du signalement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <strong>ID du contenu:</strong> {selectedReport.content_id}
                </div>
                <div>
                  <strong>Raison:</strong> {selectedReport.reason}
                </div>
                <div>
                  <strong>Description:</strong> {selectedReport.description || 'Aucune'}
                </div>
                <div>
                  <strong>Notes admin:</strong>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ajoutez des notes..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    defaultValue={selectedReport.status}
                    onValueChange={(value) =>
                      updateReportStatus(selectedReport.id, value)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="reviewing">En examen</SelectItem>
                      <SelectItem value="resolved">Résolu</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedReport(null)}
                  >
                    Fermer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet Demandes de Paiement */}
        <TabsContent value="payment-requests" className="space-y-4">
          <PaymentRequestsManager />
        </TabsContent>

        {/* Onglet Commissions */}
        <TabsContent value="commissions" className="space-y-4">
          <PlatformCommissions />
        </TabsContent>

        {/* Onglet Paiements Créateurs */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span>Gestion des paiements créateurs</span>
                </div>
                <Button onClick={exportPaymentsToCSV} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter CSV
                </Button>
              </CardTitle>
              <CardDescription>
                IBAN et revenus des créateurs pour effectuer les paiements
              </CardDescription>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email, IBAN..."
                    value={paymentSearchTerm}
                    onChange={(e) => setPaymentSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select
                  value={selectedPeriod}
                  onValueChange={(value: any) => setSelectedPeriod(value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semaine</SelectItem>
                    <SelectItem value="monthly">Mois</SelectItem>
                    <SelectItem value="quarterly">Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Créateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>BIC</TableHead>
                    <TableHead>Titulaire</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead className="text-right">Revenu</TableHead>
                    <TableHead className="text-right">Abonnés</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const revenue = selectedPeriod === 'weekly' 
                      ? payment.weekly_revenue 
                      : selectedPeriod === 'monthly'
                      ? payment.monthly_revenue
                      : payment.quarterly_revenue;

                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.stage_name || 'Sans nom'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.email}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.bank_iban || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.bank_bic || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.bank_account_holder || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            payment.payment_frequency === 'weekly' ? 'default' :
                            payment.payment_frequency === 'monthly' ? 'secondary' : 'outline'
                          }>
                            {payment.payment_frequency === 'weekly' ? 'Hebdo' :
                             payment.payment_frequency === 'monthly' ? 'Mensuel' : 'Trimestriel'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: payment.currency || 'EUR'
                          }).format(revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.total_subscribers}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucun créateur avec IBAN enregistré
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Statistiques totales */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(
                          filteredPayments.reduce((sum, p) => 
                            sum + (selectedPeriod === 'weekly' ? p.weekly_revenue :
                                   selectedPeriod === 'monthly' ? p.monthly_revenue : 
                                   p.quarterly_revenue), 0
                          )
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Total à verser ({selectedPeriod === 'weekly' ? 'semaine' : 
                                        selectedPeriod === 'monthly' ? 'mois' : 'trimestre'})
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {filteredPayments.length}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Créateurs à payer
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {filteredPayments.reduce((sum, p) => sum + p.total_subscribers, 0)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Abonnés totaux
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Logs de connexion */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logs de connexion</CardTitle>
              <CardDescription>
                Historique des connexions utilisateurs avec IP et détails
              </CardDescription>
              <div className="flex items-center gap-2 mt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par email, username, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Adresse IP</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.email}
                      </TableCell>
                      <TableCell>{log.username || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.login_method}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs">
                        {log.user_agent}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
