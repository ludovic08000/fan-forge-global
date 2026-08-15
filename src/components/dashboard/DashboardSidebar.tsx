import React from 'react';
import { LucideIcon, Command } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { DashboardSection } from './DashboardNav';

interface MenuItem {
  id: DashboardSection;
  label: string;
  icon: LucideIcon;
  badge: number;
}

interface DashboardSidebarProps {
  menuItems: MenuItem[];
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  stageName?: string;
}

// Logical grouping — Linear/Arc style
const GROUPS: { label: string; ids: DashboardSection[] }[] = [
  { label: 'Accueil',     ids: ['overview'] },
  { label: 'Création',    ids: ['content', 'stories', 'bundles', 'polls'] },
  { label: 'Communauté',  ids: ['messages', 'wishlists'] },
  { label: 'Live',        ids: ['live', 'private-lives'] },
  { label: 'Business',    ids: ['revenue', 'payments', 'partnerships', 'ai-marketing'] },
  { label: 'Compte',      ids: ['profile', 'settings'] },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  menuItems,
  activeSection,
  onSectionChange,
  stageName,
}) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const byId = new Map(menuItems.map((i) => [i.id, i]));

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <span className="text-[13px] font-bold tracking-tight">F</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold tracking-tight">
                {stageName || 'Studio'}
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Creator workspace
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        {GROUPS.map((group) => {
          const items = group.ids.map((id) => byId.get(id)).filter(Boolean) as MenuItem[];
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label} className="px-0">
              {!collapsed && (
                <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={collapsed ? item.label : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => onSectionChange(item.id)}
                            className={cn(
                              'group/item relative flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                              isActive
                                ? 'bg-foreground/[0.06] text-foreground'
                                : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground'
                            )}
                          >
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
                            )}
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-colors',
                                isActive ? 'text-primary' : 'text-muted-foreground group-hover/item:text-foreground'
                              )}
                              strokeWidth={1.75}
                            />
                            {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                            {!collapsed && item.badge > 0 && (
                              <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            )}
                            {collapsed && item.badge > 0 && (
                              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 px-2 py-2">
        {!collapsed ? (
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Command className="h-3 w-3" />
              <span>B pour replier</span>
            </span>
            <span className="rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px]">⌘B</span>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <Command className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;