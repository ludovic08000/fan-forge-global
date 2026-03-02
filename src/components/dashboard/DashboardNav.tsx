import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export type DashboardSection = 'overview' | 'content' | 'live' | 'messages' | 'analytics' | 'partnerships' | 'payments' | 'pricing' | 'ai-marketing' | 'settings';

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
    <div className="flex gap-1.5 mb-8 overflow-x-auto pb-2 scrollbar-hide">
      {menuItems.map((item) => (
        <Button
          key={item.id}
          variant={activeSection === item.id ? "default" : "ghost"}
          size="sm"
          onClick={() => onSectionChange(item.id)}
          className={`gap-2 whitespace-nowrap rounded-xl transition-all ${
            activeSection === item.id 
              ? "shadow-lg shadow-primary/20" 
              : "hover:bg-muted/60"
          }`}
          title={item.label}
        >
          <item.icon className="h-4 w-4" />
          {/* Afficher le label complet sur desktop, masqué sur mobile sauf actif */}
          <span className={`flex items-center gap-1.5 ${isMobile && activeSection !== item.id ? 'hidden' : ''}`}>
            {item.label}
          </span>
          {item.badge > 0 && (
            <Badge 
              variant="destructive" 
              className="h-5 min-w-5 px-1.5 text-[10px] font-bold"
            >
              {item.badge > 99 ? '99+' : item.badge}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
};

export default DashboardNav;
