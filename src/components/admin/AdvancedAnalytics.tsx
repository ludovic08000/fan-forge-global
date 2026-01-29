import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  RefreshCw,
  Crown,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface NicheAnalytics {
  niche: string;
  total_creators: number;
  active_subscriptions: number;
  unique_subscribers: number;
  total_revenue: number;
  conversion_rate: number;
  arpu: number;
}

interface CreatorRevenue {
  creator_id: string;
  stage_name: string;
  category: string;
  total_subscribers: number;
  total_content: number;
  subscription_revenue: number;
  tips_revenue: number;
  live_revenue: number;
  private_content_revenue: number;
  total_revenue: number;
}

interface RetentionData {
  cohort_month: string;
  total_subscribers: number;
  retained_subscribers: number;
  churned_subscribers: number;
  retention_rate: number;
  churn_rate: number;
}

interface ArpuData {
  month: string;
  paying_users: number;
  total_revenue: number;
  arpu: number;
  subscription_revenue: number;
  tips_revenue: number;
  private_content_revenue: number;
  live_revenue: number;
}

export const AdvancedAnalytics = () => {
  const [activeTab, setActiveTab] = useState('niches');

  // Fetch niche analytics
  const { data: nicheData, isLoading: nicheLoading, refetch: refetchNiche } = useQuery({
    queryKey: ['admin-niche-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_niche_analytics')
        .select('*');
      if (error) throw error;
      return data as NicheAnalytics[];
    },
  });

  // Fetch creator revenue
  const { data: creatorData, isLoading: creatorLoading, refetch: refetchCreator } = useQuery({
    queryKey: ['admin-creator-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_creator_revenue')
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as CreatorRevenue[];
    },
  });

  // Fetch retention data
  const { data: retentionData, isLoading: retentionLoading, refetch: refetchRetention } = useQuery({
    queryKey: ['admin-subscription-retention'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_subscription_retention')
        .select('*');
      if (error) throw error;
      return data as RetentionData[];
    },
  });

  // Fetch ARPU data
  const { data: arpuData, isLoading: arpuLoading, refetch: refetchArpu } = useQuery({
    queryKey: ['admin-platform-arpu'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_platform_arpu')
        .select('*');
      if (error) throw error;
      return data as ArpuData[];
    },
  });

  const handleRefresh = () => {
    refetchNiche();
    refetchCreator();
    refetchRetention();
    refetchArpu();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Calculate totals for summary cards
  const totalPlatformRevenue = nicheData?.reduce((sum, n) => sum + Number(n.total_revenue), 0) || 0;
  const totalCreators = nicheData?.reduce((sum, n) => sum + n.total_creators, 0) || 0;
  const totalSubscribers = nicheData?.reduce((sum, n) => sum + n.unique_subscribers, 0) || 0;
  const avgArpu = arpuData?.[0]?.arpu || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Analytics Avancés
          </h2>
          <p className="text-muted-foreground">
            Métriques détaillées de la plateforme
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalPlatformRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Toutes sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Créateurs Actifs</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreators}</div>
            <p className="text-xs text-muted-foreground">Par catégorie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Abonnés Uniques</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">Payants actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARPU Mensuel</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(avgArpu)}
            </div>
            <p className="text-xs text-muted-foreground">Par utilisateur payant</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="niches">Par Niche</TabsTrigger>
          <TabsTrigger value="creators">Top Créateurs</TabsTrigger>
          <TabsTrigger value="retention">Rétention</TabsTrigger>
          <TabsTrigger value="arpu">ARPU Mensuel</TabsTrigger>
        </TabsList>

        {/* Niche Analytics */}
        <TabsContent value="niches" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition du revenu par niche</CardTitle>
              </CardHeader>
              <CardContent>
                {nicheLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={nicheData?.filter(n => n.total_revenue > 0)}
                        dataKey="total_revenue"
                        nameKey="niche"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ niche, percent }) => `${niche} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {nicheData?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Conversion Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Taux de conversion par niche</CardTitle>
                <CardDescription>% de créateurs avec abonnés</CardDescription>
              </CardHeader>
              <CardContent>
                {nicheLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={nicheData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="niche" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis unit="%" />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="conversion_rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Détail par niche</CardTitle>
            </CardHeader>
            <CardContent>
              {nicheLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Niche</TableHead>
                      <TableHead className="text-right">Créateurs</TableHead>
                      <TableHead className="text-right">Abonnements</TableHead>
                      <TableHead className="text-right">Revenu</TableHead>
                      <TableHead className="text-right">Conversion</TableHead>
                      <TableHead className="text-right">ARPU</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nicheData?.map((niche) => (
                      <TableRow key={niche.niche}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">{niche.niche || 'Non catégorisé'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{niche.total_creators}</TableCell>
                        <TableCell className="text-right">{niche.active_subscriptions}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(Number(niche.total_revenue))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(niche.conversion_rate) > 50 ? 'default' : 'secondary'}>
                            {niche.conversion_rate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(Number(niche.arpu))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Creators */}
        <TabsContent value="creators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Top 20 Créateurs par revenu
              </CardTitle>
              <CardDescription>Breakdown des sources de revenus</CardDescription>
            </CardHeader>
            <CardContent>
              {creatorLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={creatorData?.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${v}€`} />
                      <YAxis type="category" dataKey="stage_name" width={120} fontSize={12} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="subscription_revenue" name="Abonnements" stackId="a" fill="hsl(var(--primary))" />
                      <Bar dataKey="tips_revenue" name="Tips" stackId="a" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="live_revenue" name="Lives" stackId="a" fill="hsl(var(--chart-3))" />
                      <Bar dataKey="private_content_revenue" name="Contenu privé" stackId="a" fill="hsl(var(--chart-4))" />
                    </BarChart>
                  </ResponsiveContainer>

                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Créateur</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-right">Abonnés</TableHead>
                        <TableHead className="text-right">Contenus</TableHead>
                        <TableHead className="text-right">Revenu Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creatorData?.map((creator, index) => (
                        <TableRow key={creator.creator_id}>
                          <TableCell>
                            {index < 3 ? (
                              <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                #{index + 1}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{creator.stage_name || 'Anonyme'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{creator.category || '-'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{creator.total_subscribers}</TableCell>
                          <TableCell className="text-right">{creator.total_content}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(Number(creator.total_revenue))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-blue-500" />
                Rétention des abonnés par cohorte
              </CardTitle>
              <CardDescription>Évolution mensuelle du taux de rétention</CardDescription>
            </CardHeader>
            <CardContent>
              {retentionLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={retentionData?.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="cohort_month" 
                        tickFormatter={(v) => format(new Date(v), 'MMM yy', { locale: fr })}
                      />
                      <YAxis unit="%" domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(v) => format(new Date(v), 'MMMM yyyy', { locale: fr })}
                        formatter={(value, name) => [`${value}%`, name === 'retention_rate' ? 'Rétention' : 'Churn']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="retention_rate" 
                        name="Taux de rétention" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="churn_rate" 
                        name="Taux de churn" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cohorte</TableHead>
                        <TableHead className="text-right">Total Abonnés</TableHead>
                        <TableHead className="text-right">Retenus</TableHead>
                        <TableHead className="text-right">Churnés</TableHead>
                        <TableHead className="text-right">Taux Rétention</TableHead>
                        <TableHead className="text-right">Taux Churn</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retentionData?.map((row) => (
                        <TableRow key={row.cohort_month}>
                          <TableCell className="font-medium">
                            {format(new Date(row.cohort_month), 'MMMM yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">{row.total_subscribers}</TableCell>
                          <TableCell className="text-right text-emerald-600">{row.retained_subscribers}</TableCell>
                          <TableCell className="text-right text-red-600">{row.churned_subscribers}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.retention_rate) > 70 ? 'default' : 'secondary'}>
                              {row.retention_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Number(row.churn_rate) < 30 ? 'outline' : 'destructive'}>
                              {row.churn_rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ARPU */}
        <TabsContent value="arpu" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                ARPU Mensuel & Breakdown des revenus
              </CardTitle>
              <CardDescription>Average Revenue Per User sur 12 mois</CardDescription>
            </CardHeader>
            <CardContent>
              {arpuLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={arpuData?.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(v) => format(new Date(v), 'MMM yy', { locale: fr })}
                      />
                      <YAxis yAxisId="left" tickFormatter={(v) => `${v}€`} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(v) => format(new Date(v), 'MMMM yyyy', { locale: fr })}
                        formatter={(value, name) => {
                          if (name === 'paying_users') return [value, 'Utilisateurs payants'];
                          return [formatCurrency(Number(value)), name === 'arpu' ? 'ARPU' : 'Revenu total'];
                        }}
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="arpu" 
                        name="ARPU" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ r: 5 }}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="paying_users" 
                        name="Utilisateurs payants" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mois</TableHead>
                        <TableHead className="text-right">Payants</TableHead>
                        <TableHead className="text-right">ARPU</TableHead>
                        <TableHead className="text-right">Abonnements</TableHead>
                        <TableHead className="text-right">Tips</TableHead>
                        <TableHead className="text-right">Lives</TableHead>
                        <TableHead className="text-right">Privé</TableHead>
                        <TableHead className="text-right font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arpuData?.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">
                            {format(new Date(row.month), 'MMM yy', { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">{row.paying_users}</TableCell>
                          <TableCell className="text-right font-mono text-purple-600 font-bold">
                            {formatCurrency(Number(row.arpu))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(Number(row.subscription_revenue || 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(Number(row.tips_revenue || 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(Number(row.live_revenue || 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(Number(row.private_content_revenue || 0))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(Number(row.total_revenue))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;
