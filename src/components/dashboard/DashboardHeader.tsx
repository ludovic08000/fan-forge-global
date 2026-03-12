import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Share2, Copy, Plus } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useTranslation } from '@/contexts/TranslationContext';

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

  return (
    <div className="relative mb-4 sm:mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl blur-xl" />
      <div className="relative flex items-center justify-between p-3 sm:p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 sm:h-14 sm:w-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm sm:text-lg">
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text truncate">
              {t('dashboard.myCreatorSpace')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {user.user_metadata?.stage_name || user.user_metadata?.display_name || user.user_metadata?.username || t('dashboard.myCreatorSpace')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {shareLink && (
            <Button onClick={onCopyLink} variant="outline" size="icon" className="rounded-xl h-8 w-8 sm:h-9 sm:w-auto sm:px-3 sm:gap-2" title={shareDisplayName || shareLink}>
              {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? t('dashboard.copied') : `${t('dashboard.share')} ${shareDisplayName || ''}`}</span>
            </Button>
          )}
          <Button onClick={onNewContent} size="icon" className="rounded-xl h-8 w-8 sm:h-9 sm:w-auto sm:px-3 sm:gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.newContent')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
