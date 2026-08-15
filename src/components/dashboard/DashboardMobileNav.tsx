import React, { useState } from 'react';
import { Home, ImageIcon, Plus, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { DashboardSection } from './DashboardNav';
import type { LucideIcon } from 'lucide-react';

interface MenuItem {
  id: DashboardSection;
  label: string;
  icon: LucideIcon;
  badge: number;
}

interface DashboardMobileNavProps {
  menuItems: MenuItem[];
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  onNewContent: () => void;
  unreadCount: number;
}

const PRIMARY: DashboardSection[] = ['overview', 'content', 'messages'];

export const DashboardMobileNav: React.FC<DashboardMobileNavProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
  onNewContent,
  unreadCount,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const others = menuItems.filter((i) => !PRIMARY.includes(i.id));
  const moreActive = !PRIMARY.includes(activeSection);

  const Tab = ({
    icon: Icon,
    label,
    active,
    badge,
    onClick,
  }: {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    badge?: number;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <span className="relative">
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.75} />
        {!!badge && badge > 0 && (
          <span className="absolute -right-2 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[10px] font-medium leading-none">{label}</span>
    </button>
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigation créateur"
    >
      <div className="mx-auto flex h-[60px] w-full max-w-lg items-stretch">
        <Tab icon={Home} label="Accueil" active={activeSection === 'overview'} onClick={() => onSectionChange('overview')} />
        <Tab icon={ImageIcon} label="Contenus" active={activeSection === 'content'} onClick={() => onSectionChange('content')} />

        {/* Créer */}
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <button
            type="button"
            onClick={onNewContent}
            aria-label="Publier un contenu"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>

        <Tab
          icon={MessageCircle}
          label="Messages"
          active={activeSection === 'messages'}
          badge={unreadCount}
          onClick={() => onSectionChange('messages')}
        />

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1',
                moreActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2 : 1.75} />
              <span className="w-full truncate text-center text-[10px] font-medium leading-none">Plus</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-4 pb-8">
            <SheetHeader className="text-left">
              <SheetTitle className="text-base">Tous les outils</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {others.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onSectionChange(item.id);
                    }}
                    className={cn(
                      'flex h-[88px] flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center transition-colors',
                      active
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-border/60 bg-background text-foreground active:bg-muted/40'
                    )}
                  >
                    <span className="relative">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                      {item.badge > 0 && (
                        <span className="absolute -right-2 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-[11px] font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default DashboardMobileNav;