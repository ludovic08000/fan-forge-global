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

  if (isMobile) {
    return (
      <div className="mb-4 -mx-4 px-4">
        <div className="flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {menuItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center shrink-0 rounded-2xl transition-all duration-200 outline-none",
                  "w-[60px] h-[60px] gap-1"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center rounded-[14px] h-9 w-9 transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-muted/50 text-muted-foreground"
                )}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className={cn(
                  "text-[9px] font-medium leading-none truncate w-full text-center px-0.5",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                {item.badge > 0 && (
                  <span className="absolute top-0 right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop: macOS Dock style
  return (
    <div className="mb-6 flex justify-center">
      <div className="inline-flex items-end gap-1 p-2 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg shadow-black/5 dark:shadow-black/20">
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              title={item.label}
              className={cn(
                "group relative flex flex-col items-center gap-1 rounded-xl transition-all duration-200 outline-none",
                "min-w-[64px] px-3 py-2",
                isActive
                  ? "bg-primary/10"
                  : "hover:bg-muted/60 hover:scale-105"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-xl h-9 w-9 transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground group-hover:text-foreground"
              )}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-tight text-center truncate max-w-[60px]",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className="absolute -top-0.5 right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold shadow-sm">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
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
