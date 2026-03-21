import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, MoreHorizontal } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';

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

// Primary sections shown directly on mobile (max 4 + "More")
const PRIMARY_SECTIONS: DashboardSection[] = ['overview', 'content', 'live', 'messages'];

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pendingSectionRef = React.useRef<DashboardSection | null>(null);

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open && pendingSectionRef.current) {
      const section = pendingSectionRef.current;
      pendingSectionRef.current = null;
      onSectionChange(section);
    }
  };

  const { primaryItems, secondaryItems } = useMemo(() => {
    if (!isMobile) return { primaryItems: menuItems, secondaryItems: [] };
    return {
      primaryItems: menuItems.filter(item => PRIMARY_SECTIONS.includes(item.id)),
      secondaryItems: menuItems.filter(item => !PRIMARY_SECTIONS.includes(item.id)),
    };
  }, [menuItems, isMobile]);

  // Check if active section is in secondary items (show active state on "More" button)
  const isSecondaryActive = secondaryItems.some(item => item.id === activeSection);
  const totalSecondaryBadges = secondaryItems.reduce((sum, item) => sum + item.badge, 0);

  if (isMobile) {
    return (
      <>
        <div className="flex gap-1.5 mb-4 pb-1">
          {/* Primary nav buttons */}
          {primaryItems.map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            const colors = sectionColors[item.id];

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "relative flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 outline-none min-w-0",
                  isActive
                    ? `${colors.activeBg} text-white shadow-lg`
                    : `${colors.bg} ${colors.text} hover:scale-105`
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="text-[10px] font-medium leading-tight truncate w-full text-center">
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

          {/* "More" button */}
          {secondaryItems.length > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all duration-200 outline-none min-w-0",
                isSecondaryActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-muted/60 text-muted-foreground hover:scale-105"
              )}
            >
              <MoreHorizontal className="h-[18px] w-[18px] shrink-0" />
              <span className="text-[10px] font-medium leading-tight">Plus</span>
              {totalSecondaryBadges > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                  {totalSecondaryBadges > 99 ? '99+' : totalSecondaryBadges}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Secondary sections drawer */}
        <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
          <DrawerContent className="pb-safe-area-inset-bottom">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base">Plus d'options</DrawerTitle>
            </DrawerHeader>
            <div className="grid grid-cols-3 gap-2 px-4 pb-6">
              {secondaryItems.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;
                const colors = sectionColors[item.id];

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      pendingSectionRef.current = item.id;
                      setDrawerOpen(false);
                    }}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 outline-none",
                      isActive
                        ? `${colors.activeBg} text-white shadow-md`
                        : `${colors.bg} ${colors.text} active:scale-95`
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-[11px] font-medium leading-tight text-center">
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
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: labeled pills (unchanged)
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
