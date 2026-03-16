import React from 'react';
import { Upload, Radio, MessageCircle, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardSection } from './DashboardNav';
import { useTranslation } from '@/contexts/TranslationContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface DashboardQuickActionsProps {
  onNewContent: () => void;
  onSectionChange: (section: DashboardSection) => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  onNewContent,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const actions = [
    {
      label: t('dashboard.newContent'),
      desc: t('dashboard.photosVideos'),
      icon: Upload,
      color: 'primary',
      onClick: onNewContent,
      borderClass: 'border-border/50 hover:border-primary/30',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      hoverShadow: 'hover:shadow-primary/5',
    },
    {
      label: t('dashboard.startLive'),
      desc: t('dashboard.directStreaming'),
      icon: Radio,
      color: 'rose',
      onClick: () => onSectionChange('live'),
      borderClass: 'border-border/50 hover:border-rose-500/30',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-500',
      hoverShadow: 'hover:shadow-rose-500/5',
    },
    {
      label: t('dashboard.messages'),
      desc: t('dashboard.chatWithFans'),
      icon: MessageCircle,
      color: 'blue',
      onClick: () => onSectionChange('messages'),
      borderClass: 'border-border/50 hover:border-blue-500/30',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      hoverShadow: 'hover:shadow-blue-500/5',
    },
    {
      label: t('dashboard.partnerships'),
      desc: t('dashboard.collaborateEarnMore'),
      icon: Handshake,
      color: 'purple',
      onClick: () => navigate('/partnerships'),
      borderClass: 'border-purple-500/30 hover:border-purple-500/50',
      iconBg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500',
      hoverShadow: 'hover:shadow-purple-500/10',
      labelColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  if (isMobile) {
    // Compact 2x2 grid on mobile: icon + label only, no description
    return (
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={action.onClick}
              className={cn(
                "group flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card/50 backdrop-blur-sm hover:bg-card transition-all active:scale-95",
                action.borderClass
              )}
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", action.iconBg)}>
                <Icon className={cn("h-4 w-4", action.iconColor)} />
              </div>
              <span className={cn("text-[10px] font-medium text-center leading-tight", action.labelColor)}>
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <div
            key={i}
            className={cn(
              "group cursor-pointer p-5 rounded-2xl border bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-xl transition-all",
              action.borderClass,
              action.hoverShadow
            )}
            onClick={action.onClick}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", action.iconBg)}>
              <Icon className={cn("h-6 w-6", action.iconColor)} />
            </div>
            <h3 className={cn("font-semibold mb-1", action.labelColor)}>{action.label}</h3>
            <p className="text-xs text-muted-foreground">{action.desc}</p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardQuickActions;
