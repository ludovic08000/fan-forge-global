import React from 'react';
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

export const DashboardNav: React.FC<DashboardNavProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex gap-1.5 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
      {menuItems.map((item) => {
        const isActive = activeSection === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            title={item.label}
            className={cn(
              "relative flex items-center gap-1.5 px-2.5 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "bg-card/60 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/60 hover:border-border backdrop-blur-sm"
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            {(!isMobile || isActive) && (
              <span className="truncate max-w-[80px] sm:max-w-none">{item.label}</span>
            )}
            {item.badge > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "h-4 min-w-4 px-1 text-[9px] font-bold leading-none",
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : ""
                )}
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
