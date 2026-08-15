import React from 'react';
import { Euro, Users, Eye, Heart } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface CreatorStats {
  totalEarnings: number;
  totalSubscribers: number;
  totalViews: number;
  totalLikes: number;
}

interface DashboardStatsProps {
  stats: CreatorStats;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const { t } = useTranslation();

  const compact = (n: number) =>
    new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);

  const items = [
    {
      icon: Euro,
      label: t('dashboard.totalRevenue'),
      value: new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(stats.totalEarnings),
      accent: true,
    },
    {
      icon: Users,
      label: t('dashboard.activeSubscribers'),
      value: compact(stats.totalSubscribers),
    },
    {
      icon: Eye,
      label: t('dashboard.totalViews'),
      value: compact(stats.totalViews),
    },
    {
      icon: Heart,
      label: t('dashboard.likesReceived'),
      value: compact(stats.totalLikes),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="group relative flex h-[116px] flex-col justify-between bg-background p-4 transition-colors hover:bg-muted/30 sm:h-[128px] sm:p-5"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  'truncate text-2xl font-semibold leading-none tracking-tight tabular-nums sm:text-3xl',
                  item.accent ? 'text-primary' : 'text-foreground'
                )}
              >
                {item.value}
              </p>
              <p className="mt-2 truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {item.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;
