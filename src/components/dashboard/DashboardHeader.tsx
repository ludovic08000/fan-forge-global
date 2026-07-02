import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Share2, Copy, Plus, Check } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useTranslation } from '@/contexts/TranslationContext';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface DashboardHeaderProps {
  user: User;
  shareLink: string;
  shareDisplayName?: string;
  copied: boolean;
  onCopyLink: () => void;
  onNewContent: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  shareLink,
  shareDisplayName,
  copied,
  onCopyLink,
  onNewContent,
}) => {
  const { t } = useTranslation();
  const displayName =
    user.user_metadata?.stage_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.username ||
    '';

  return (
    <header className="sticky top-16 z-30 -mx-4 mb-6 flex h-14 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <SidebarTrigger className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground" />

      <div className="flex items-center gap-2 min-w-0">
        <div className="relative shrink-0">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-foreground text-background text-[11px] font-semibold">
              {(displayName || user.email || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <div className="min-w-0 hidden sm:block">
          <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-foreground">
            {displayName}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground leading-tight">
            En ligne
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {shareLink && (
          <Button
            onClick={onCopyLink}
            variant="outline"
            size="sm"
            className="hidden md:inline-flex h-8 gap-2 rounded-md border-border/60 bg-background px-2.5 font-mono text-[11px] font-normal text-muted-foreground hover:text-foreground"
            title={shareDisplayName || shareLink}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
            <span className="max-w-[180px] truncate">
              {shareDisplayName ? `@${shareDisplayName}` : t('dashboard.share' as any) || 'Partager'}
            </span>
          </Button>
        )}
        {shareLink && (
          <Button
            onClick={onCopyLink}
            variant="outline"
            size="icon"
            className="md:hidden h-8 w-8 rounded-md border-border/60"
            title={shareDisplayName || shareLink}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button
          onClick={onNewContent}
          size="sm"
          className="h-8 gap-1.5 rounded-md bg-foreground px-3 text-[12px] font-medium text-background hover:bg-foreground/90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="hidden sm:inline">Nouveau</span>
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
