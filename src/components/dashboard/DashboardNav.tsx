import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export type DashboardSection = 'overview' | 'content' | 'live' | 'messages' | 'analytics' | 'bundles' | 'wishlists' | 'polls' | 'partnerships' | 'payments' | 'pricing' | 'ai-marketing' | 'settings';

interface MenuItem {
  id: DashboardSection;
  label: string;
  icon: LucideIcon;
  badge: number;
}

interface DashboardNavProps {
  menuItems: MenuItem[];
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
}

// Color mapping per section
const sectionColors: Record<DashboardSection, { bg: string; text: string; activeBg: string }> = {
  overview:       { bg: 'bg-blue-500/10',    text: 'text-blue-500',    activeBg: 'bg-blue-500' },
  content:        { bg: 'bg-violet-500/10',   text: 'text-violet-500',  activeBg: 'bg-violet-500' },
  live:           { bg: 'bg-rose-500/10',     text: 'text-rose-500',    activeBg: 'bg-rose-500' },
  messages:       { bg: 'bg-sky-500/10',      text: 'text-sky-500',     activeBg: 'bg-sky-500' },
  analytics:      { bg: 'bg-emerald-500/10',  text: 'text-emerald-500', activeBg: 'bg-emerald-500' },
  bundles:        { bg: 'bg-amber-500/10',    text: 'text-amber-500',   activeBg: 'bg-amber-500' },
  wishlists:      { bg: 'bg-pink-500/10',     text: 'text-pink-500',    activeBg: 'bg-pink-500' },
  polls:          { bg: 'bg-indigo-500/10',   text: 'text-indigo-500',  activeBg: 'bg-indigo-500' },
  partnerships:   { bg: 'bg-purple-500/10',   text: 'text-purple-500',  activeBg: 'bg-purple-500' },
  payments:       { bg: 'bg-green-500/10',    text: 'text-green-500',   activeBg: 'bg-green-500' },
  pricing:        { bg: 'bg-orange-500/10',   text: 'text-orange-500',  activeBg: 'bg-orange-500' },
  'ai-marketing': { bg: 'bg-cyan-500/10',     text: 'text-cyan-500',    activeBg: 'bg-cyan-500' },
  settings:       { bg: 'bg-slate-500/10',    text: 'text-slate-500',   activeBg: 'bg-slate-500' },
};

export const DashboardNav: React.FC<DashboardNavProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
}) => {
  const isMobile = useIsMobile();

  // On mobile: horizontal scrollable row of all items
  if (isMobile) {
    return (
      <div className="flex gap-1.5 mb-4 pb-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          const colors = sectionColors[item.id];

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 outline-none shrink-0",
                isActive
                  ? `${colors.activeBg} text-white shadow-lg`
                  : `${colors.bg} ${colors.text}`
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="text-[10px] font-medium leading-tight whitespace-nowrap">
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop: labeled pills
  return (
    <div className="flex flex-nowrap gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
      {menuItems.map((item) => {
        const isActive = activeSection === item.id;
        const Icon = item.icon;
        const colors = sectionColors[item.id];

        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            title={item.label}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none",
              isActive
                ? `${colors.activeBg} text-white shadow-md`
                : `${colors.bg} ${colors.text} hover:brightness-110 border border-transparent hover:border-border/30`
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.badge > 0 && (
              <Badge
                variant="destructive"
                className="h-4 min-w-4 px-1 text-[9px] font-bold leading-none"
              >
                {item.badge > 99 ? '99+' : item.badge}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DashboardNav;
