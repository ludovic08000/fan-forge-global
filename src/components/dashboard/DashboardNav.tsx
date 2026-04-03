import React from 'react';
import { LucideIcon } from 'lucide-react';
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

// macOS-style icon colors
const iconColors: Record<DashboardSection, string> = {
  overview:       'from-blue-500 to-blue-600',
  content:        'from-violet-500 to-purple-600',
  live:           'from-rose-500 to-red-600',
  messages:       'from-green-500 to-emerald-600',
  analytics:      'from-orange-400 to-orange-600',
  bundles:        'from-amber-500 to-yellow-600',
  wishlists:      'from-pink-500 to-rose-600',
  polls:          'from-indigo-500 to-blue-600',
  partnerships:   'from-purple-500 to-violet-600',
  payments:       'from-emerald-500 to-green-600',
  pricing:        'from-cyan-500 to-teal-600',
  'ai-marketing': 'from-fuchsia-500 to-pink-600',
  settings:       'from-gray-500 to-slate-600',
};

export const DashboardNav: React.FC<DashboardNavProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
}) => {
  return (
    <div className="mb-6">
      <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-x-2 gap-y-4 px-2">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          const gradient = iconColors[item.id];

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className="group relative flex flex-col items-center gap-1.5 outline-none"
            >
              {/* App icon */}
              <div className={cn(
                "relative flex items-center justify-center w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-br shadow-lg transition-transform duration-200",
                gradient,
                isActive
                  ? "scale-105 shadow-xl ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                  : "group-hover:scale-110 group-active:scale-95"
              )}>
                <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-sm" strokeWidth={1.8} />

                {/* Badge */}
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-md border-2 border-background">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "text-[11px] leading-tight text-center w-full truncate px-0.5",
                isActive ? "text-foreground font-semibold" : "text-muted-foreground font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardNav;
