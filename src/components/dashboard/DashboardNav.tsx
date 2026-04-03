import React from 'react';
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

export const DashboardNav: React.FC<DashboardNavProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="mb-6">
      {/* macOS Dock style container */}
      <div className={cn(
        "inline-flex items-end gap-1 p-1.5 rounded-2xl",
        "bg-card/80 backdrop-blur-xl border border-border/50",
        "shadow-lg shadow-black/5 dark:shadow-black/20",
        isMobile ? "overflow-x-auto scrollbar-hide w-full" : "flex-wrap justify-center w-full"
      )}>
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              title={item.label}
              className={cn(
                "group relative flex flex-col items-center gap-0.5 rounded-xl transition-all duration-200 outline-none",
                isMobile ? "min-w-[56px] px-2 py-1.5" : "min-w-[64px] px-3 py-2",
                isActive
                  ? "bg-primary/10 scale-105"
                  : "hover:bg-muted/60 hover:scale-105"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "flex items-center justify-center rounded-xl transition-all duration-200",
                isMobile ? "h-8 w-8" : "h-9 w-9",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground group-hover:text-foreground"
              )}>
                <Icon className={cn(isMobile ? "h-4 w-4" : "h-[18px] w-[18px]")} />
              </div>

              {/* Label */}
              <span className={cn(
                "text-[10px] font-medium leading-tight text-center truncate max-w-[56px]",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {item.label}
              </span>

              {/* Badge */}
              {item.badge > 0 && (
                <span className="absolute -top-0.5 right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold shadow-sm">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}

              {/* Active dot indicator (macOS style) */}
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardNav;
