import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreatorRevenueSeries,
  REVENUE_RANGES,
  formatEuro,
  type RevenueRange,
} from '@/hooks/useCreatorRevenue';

interface DashboardRevenueChartProps {
  creatorId?: string;
  /** Affiche la répartition par source sous le graphique */
  showBreakdown?: boolean;
  className?: string;
}

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{p.label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{formatEuro(p.total)}</p>
    </div>
  );
};

export const DashboardRevenueChart: React.FC<DashboardRevenueChartProps> = ({
  creatorId,
  showBreakdown = true,
  className,
}) => {
  const [range, setRange] = useState<RevenueRange>('30d');
  const { points, totals, isLoading } = useCreatorRevenueSeries(creatorId, range);

  const hasRevenue = totals.total > 0;

  const sources = [
    { label: 'Abonnements', value: totals.subscriptions },
    { label: 'Tips', value: totals.tips },
    { label: 'Lives', value: totals.live },
    { label: 'Contenus privés', value: totals.privateContent },
  ].filter((s) => s.value > 0);

  return (
    <section className={cn('rounded-xl border border-border/60 bg-background', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Revenus</p>
          <p className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-foreground">
            {isLoading ? '—' : formatEuro(totals.total)}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Période"
          className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/60 p-0.5"
        >
          {REVENUE_RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                'h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors',
                range === r.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[220px] w-full p-2 sm:h-[260px] sm:p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !hasRevenue ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <TrendingUp className="h-5 w-5 text-muted-foreground/60" strokeWidth={1.75} />
            <p className="text-sm font-medium text-foreground">Aucun revenu sur cette période</p>
            <p className="text-[12px] text-muted-foreground">
              Les revenus réels s'afficheront ici dès la première transaction.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                width={44}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => formatEuro(Number(v), true)}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueFill)"
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sources réelles uniquement */}
      {showBreakdown && hasRevenue && sources.length > 0 && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl border-t border-border/60 bg-border/60 sm:grid-cols-4">
          {sources.map((s) => (
            <div key={s.label} className="bg-background p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground truncate">{s.label}</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{formatEuro(s.value)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default DashboardRevenueChart;