import React from 'react';
import { Upload, Radio, MessageCircle, ImageIcon, ArrowUpRight } from 'lucide-react';
import { DashboardSection } from './DashboardNav';
import { useTranslation } from '@/contexts/TranslationContext';
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

  const actions = [
    { label: t('dashboard.newContent'),   desc: t('dashboard.photosVideos'),        icon: Upload,        onClick: onNewContent,                       primary: true },
    { label: t('dashboard.startLive'),    desc: t('dashboard.directStreaming'),     icon: Radio,         onClick: () => onSectionChange('live') },
    { label: t('dashboard.messages'),     desc: t('dashboard.chatWithFans'),        icon: MessageCircle, onClick: () => onSectionChange('messages') },
    { label: t('dashboard.myContent'),    desc: t('dashboard.photosVideos'),        icon: ImageIcon,     onClick: () => onSectionChange('content') },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <button
            key={i}
            onClick={action.onClick}
            className={cn(
              'group relative flex h-[104px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors sm:p-4',
              action.primary
                ? 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                : 'border-border/60 bg-background hover:border-foreground/40 hover:bg-muted/30'
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  action.primary
                    ? 'bg-background/15 text-background'
                    : 'bg-muted/60 text-muted-foreground group-hover:bg-foreground group-hover:text-background'
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <ArrowUpRight
                className={cn(
                  'h-3.5 w-3.5 transition-all',
                  action.primary
                    ? 'text-background/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                    : 'text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                )}
              />
            </div>
            <div className="min-w-0">
              <p className={cn('text-[13px] font-semibold tracking-tight truncate', action.primary ? 'text-background' : 'text-foreground')}>
                {action.label}
              </p>
              <p className={cn('text-[11px] mt-0.5 hidden sm:block truncate', action.primary ? 'text-background/70' : 'text-muted-foreground')}>
                {action.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DashboardQuickActions;
