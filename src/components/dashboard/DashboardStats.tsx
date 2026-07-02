import React from 'react';
import { Euro, Users, Eye, Heart, ArrowUpRight } from 'lucide-react';
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
      value: stats.totalSubscribers.toLocaleString('fr-FR'),
    },
    {
      icon: Eye,
      label: t('dashboard.totalViews'),
      value: stats.totalViews.toLocaleString('fr-FR'),
    },
    {
      icon: Heart,
      label: t('dashboard.likesReceived'),
      value: stats.totalLikes.toLocaleString('fr-FR'),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            className="group relative flex flex-col justify-between gap-6 bg-background p-4 sm:p-5 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p
                className={cn(
                  'text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums',
                  item.accent ? 'text-primary' : 'text-foreground'
                )}
              >
                {item.value}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground truncate">
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
