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
import { AlertTriangle, FileText, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import CreatorPayments from '@/components/admin/CreatorPayments';

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

/**
 * Page du dashboard administrateur
 */
const AdminDashboard = () => {
  const { userRole } = useAuth();
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadReports(), loadLoginLogs()]);
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

        {/* Onglet Paiements créateurs */}
        <TabsContent value="payments">
          <CreatorPayments />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
