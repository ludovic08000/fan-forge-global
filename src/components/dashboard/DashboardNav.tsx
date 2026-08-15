import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DashboardSection =
  | 'overview'
  | 'content'
  | 'stories'
  | 'live'
  | 'private-lives'
  | 'messages'
  | 'analytics'
  | 'bundles'
  | 'wishlists'
  | 'polls'
  | 'partnerships'
  | 'revenue'
  | 'payments'
  | 'pricing'
  | 'ai-marketing'
  | 'profile'
  | 'settings';

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
const iconColors: Partial<Record<DashboardSection, string>> = {
  overview:       'from-blue-500 to-blue-600',
  content:        'from-violet-500 to-purple-600',
  stories:        'from-sky-500 to-blue-600',
  live:           'from-rose-500 to-red-600',
  'private-lives':'from-rose-400 to-pink-600',
  messages:       'from-green-500 to-emerald-600',
  analytics:      'from-orange-400 to-orange-600',
  bundles:        'from-amber-500 to-yellow-600',
  wishlists:      'from-pink-500 to-rose-600',
  polls:          'from-indigo-500 to-blue-600',
  partnerships:   'from-purple-500 to-violet-600',
  revenue:        'from-emerald-500 to-green-600',
  payments:       'from-emerald-500 to-green-600',
  pricing:        'from-cyan-500 to-teal-600',
  'ai-marketing': 'from-fuchsia-500 to-pink-600',
  profile:        'from-slate-500 to-gray-600',
  settings:       'from-gray-500 to-slate-600',
};

export const DashboardNav: React.FC<DashboardNavProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
}) => {
  return (
    <nav className="mb-8">
      {/* iOS-style app grid — centered, padded, no overflow */}
      <div className="mx-auto max-w-lg md:max-w-3xl">
        <div className="grid grid-cols-4 xs:grid-cols-5 md:grid-cols-10 gap-y-5 gap-x-1 justify-items-center">
          {menuItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            const gradient = iconColors[item.id] ?? 'from-slate-500 to-slate-600';

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className="group relative flex flex-col items-center gap-1 outline-none w-[68px]"
              >
                {/* Icon square */}
                <div className={cn(
                  "relative flex items-center justify-center w-[50px] h-[50px] rounded-[14px] bg-gradient-to-br shadow-md transition-all duration-200",
                  gradient,
                  isActive
                    ? "ring-[2.5px] ring-primary/50 ring-offset-2 ring-offset-background shadow-lg scale-[1.05]"
                    : "group-hover:scale-105 group-active:scale-90"
                )}>
                  <Icon className="h-[22px] w-[22px] text-white drop-shadow-sm" strokeWidth={1.8} />

                  {/* Badge */}
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold border-2 border-background">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Label — always visible, never truncated */}
                <span className={cn(
                  "text-[10px] leading-tight text-center w-full line-clamp-1",
                  isActive ? "text-foreground font-semibold" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default DashboardNav;
