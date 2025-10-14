import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveAnalytics } from '@/hooks/useLiveAnalytics';
import { TrendingUp, Users, Clock, MessageSquare, DollarSign, BarChart } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface LiveAnalyticsDashboardProps {
  liveStreamId: string;
}

export const LiveAnalyticsDashboard = ({ liveStreamId }: LiveAnalyticsDashboardProps) => {
  const { analytics, loading } = useLiveAnalytics(liveStreamId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Aucune donnée disponible
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Spectateurs totaux',
      value: analytics.totalViewers,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'Pic de spectateurs',
      value: analytics.peakViewers,
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'Temps moyen',
      value: `${Math.round(analytics.averageViewTime)}min`,
      icon: Clock,
      color: 'text-orange-500',
    },
    {
      label: 'Messages',
      value: analytics.totalMessages,
      icon: MessageSquare,
      color: 'text-purple-500',
    },
    {
      label: 'Revenus',
      value: `${analytics.totalRevenue.toFixed(2)}€`,
      icon: DollarSign,
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Métriques principales */}
      <div className="grid gap-4 md:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Graphique spectateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Spectateurs dans le temps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.viewersByTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique revenus par minute */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Revenus par minute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.revenueByMinute}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="minute" label={{ value: 'Minutes', position: 'insideBottom', offset: -5 }} />
              <YAxis
                yAxisId="left"
                label={{ value: 'Spectateurs', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: 'Revenus (€)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="viewers"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Spectateurs"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                name="Revenus (€)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Messages par spectateur</span>
              <Badge variant="secondary">
                {analytics.totalViewers > 0
                  ? (analytics.totalMessages / analytics.totalViewers).toFixed(1)
                  : 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taux de rétention</span>
              <Badge variant="secondary">
                {analytics.peakViewers > 0
                  ? Math.round((analytics.totalViewers / analytics.peakViewers) * 100)
                  : 0}
                %
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenu par spectateur</span>
              <Badge variant="secondary">
                {analytics.totalViewers > 0
                  ? (analytics.totalRevenue / analytics.totalViewers).toFixed(2)
                  : 0}
                €
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
