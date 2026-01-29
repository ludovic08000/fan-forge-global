import { useState, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  RefreshCw,
  Crown,
  Activity,
  Download,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, subDays, subMonths, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

type PeriodFilter = '7d' | '30d' | '90d' | '1y' | 'all';

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

interface AnalyticsAlert {
  type: 'warning' | 'danger';
  title: string;
  message: string;
}

// CSV Export utility
const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const val = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const strVal = String(val ?? '');
        return strVal.includes(',') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
};

// Period filter utility
const filterByPeriod = <T extends { cohort_month?: string; month?: string }>(
  data: T[] | undefined,
  period: PeriodFilter,
  dateField: 'cohort_month' | 'month'
): T[] => {
  if (!data) return [];
  if (period === 'all') return data;
  
  const now = new Date();
  let cutoffDate: Date;
  
  switch (period) {
    case '7d':
      cutoffDate = subDays(now, 7);
      break;
    case '30d':
      cutoffDate = subDays(now, 30);
      break;
    case '90d':
      cutoffDate = subDays(now, 90);
      break;
    case '1y':
      cutoffDate = subMonths(now, 12);
      break;
    default:
      return data;
  }
  
  return data.filter(item => {
    const dateStr = item[dateField];
    if (!dateStr) return false;
    try {
      return isAfter(parseISO(dateStr), cutoffDate);
    } catch {
      return false;
    }
  });
};

export const AdvancedAnalytics = () => {
  const [activeTab, setActiveTab] = useState('niches');
  const [period, setPeriod] = useState<PeriodFilter>('30d');

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

  // Filter data by period
  const filteredRetention = useMemo(() => 
    filterByPeriod(retentionData, period, 'cohort_month'),
    [retentionData, period]
  );

  const filteredArpu = useMemo(() => 
    filterByPeriod(arpuData, period, 'month'),
    [arpuData, period]
  );

  // Calculate period comparison (current vs previous)
  const periodComparison = useMemo(() => {
    if (!filteredArpu || filteredArpu.length < 2) return null;
    
    const sortedData = [...filteredArpu].sort((a, b) => 
      new Date(b.month).getTime() - new Date(a.month).getTime()
    );
    
    const current = sortedData[0];
    const previous = sortedData[1];
    
    if (!current || !previous) return null;
    
    const revenueGrowth = previous.total_revenue > 0 
      ? ((Number(current.total_revenue) - Number(previous.total_revenue)) / Number(previous.total_revenue)) * 100 
      : 0;
    
    const usersGrowth = previous.paying_users > 0 
      ? ((current.paying_users - previous.paying_users) / previous.paying_users) * 100 
      : 0;
    
    const arpuGrowth = previous.arpu > 0 
      ? ((Number(current.arpu) - Number(previous.arpu)) / Number(previous.arpu)) * 100 
      : 0;
    
    return {
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      usersGrowth: Math.round(usersGrowth * 10) / 10,
      arpuGrowth: Math.round(arpuGrowth * 10) / 10,
      currentMonth: current.month,
      previousMonth: previous.month,
    };
  }, [filteredArpu]);

  // Generate alerts
  const alerts = useMemo<AnalyticsAlert[]>(() => {
    const result: AnalyticsAlert[] = [];
    
    // Check churn rate
    if (filteredRetention && filteredRetention.length > 0) {
      const latestRetention = filteredRetention.reduce((latest, current) => 
        new Date(current.cohort_month) > new Date(latest.cohort_month) ? current : latest
      );
      
      if (Number(latestRetention.churn_rate) > 40) {
        result.push({
          type: 'danger',
          title: 'Churn élevé détecté',
          message: `Le taux de churn atteint ${latestRetention.churn_rate}% pour ${format(new Date(latestRetention.cohort_month), 'MMMM yyyy', { locale: fr })}. Action recommandée.`
        });
      } else if (Number(latestRetention.churn_rate) > 25) {
        result.push({
          type: 'warning',
          title: 'Churn en hausse',
          message: `Le taux de churn est de ${latestRetention.churn_rate}% pour ${format(new Date(latestRetention.cohort_month), 'MMMM yyyy', { locale: fr })}.`
        });
      }
    }
    
    // Check conversion rate drop
    if (nicheData) {
      const lowConversion = nicheData.filter(n => Number(n.conversion_rate) < 10 && n.total_creators > 5);
      if (lowConversion.length > 0) {
        result.push({
          type: 'warning',
          title: 'Faible conversion',
          message: `${lowConversion.length} niche(s) ont un taux de conversion < 10%: ${lowConversion.map(n => n.niche || 'Non catégorisé').join(', ')}`
        });
      }
    }
    
    // Check revenue decline
    if (periodComparison && periodComparison.revenueGrowth < -15) {
      result.push({
        type: 'danger',
        title: 'Baisse de revenu significative',
        message: `Le revenu a baissé de ${Math.abs(periodComparison.revenueGrowth)}% par rapport au mois précédent.`
      });
    }
    
    return result;
  }, [filteredRetention, nicheData, periodComparison]);

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
  const avgArpu = filteredArpu?.[0]?.arpu || 0;

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-muted-foreground text-sm">--</span>;
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {isPositive ? '+' : ''}{value}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Analytics Avancés
          </h2>
          <p className="text-muted-foreground">
            Métriques détaillées de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">90 jours</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Alert key={i} variant={alert.type === 'danger' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards with Growth */}
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Toutes sources</p>
              {periodComparison && <GrowthIndicator value={periodComparison.revenueGrowth} />}
            </div>
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Payants actifs</p>
              {periodComparison && <GrowthIndicator value={periodComparison.usersGrowth} />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARPU Mensuel</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(Number(avgArpu))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Par utilisateur payant</p>
              {periodComparison && <GrowthIndicator value={periodComparison.arpuGrowth} />}
            </div>
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
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => nicheData && exportToCSV(nicheData as unknown as Record<string, unknown>[], 'niches_analytics')}
              disabled={!nicheData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
                          <Badge variant={Number(niche.conversion_rate) > 50 ? 'default' : Number(niche.conversion_rate) < 10 ? 'destructive' : 'secondary'}>
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
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => creatorData && exportToCSV(creatorData as unknown as Record<string, unknown>[], 'top_creators')}
              disabled={!creatorData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => filteredRetention && exportToCSV(filteredRetention as unknown as Record<string, unknown>[], 'retention')}
              disabled={!filteredRetention || filteredRetention.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-blue-500" />
                Rétention des abonnés par cohorte
              </CardTitle>
              <CardDescription>Évolution mensuelle du taux de rétention ({period === 'all' ? 'toute la période' : period})</CardDescription>
            </CardHeader>
            <CardContent>
              {retentionLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={filteredRetention?.slice().reverse()}>
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
                      {filteredRetention?.map((row) => (
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
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => filteredArpu && exportToCSV(filteredArpu as unknown as Record<string, unknown>[], 'arpu')}
              disabled={!filteredArpu || filteredArpu.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                ARPU Mensuel & Breakdown des revenus
              </CardTitle>
              <CardDescription>Average Revenue Per User ({period === 'all' ? 'toute la période' : period})</CardDescription>
            </CardHeader>
            <CardContent>
              {arpuLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={filteredArpu?.slice().reverse()}>
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
                      {filteredArpu?.map((row) => (
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
