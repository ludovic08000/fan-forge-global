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
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl blur-xl" />
      <div className="relative flex items-center justify-between p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-lg">
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {t('dashboard.myCreatorSpace')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.user_metadata?.stage_name || user.user_metadata?.display_name || user.user_metadata?.username || t('dashboard.myCreatorSpace')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {shareLink && (
            <Button onClick={onCopyLink} variant="outline" size="sm" className="gap-2 rounded-xl" title={shareDisplayName || shareLink}>
              {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? t('dashboard.copied') : `${t('dashboard.share')} ${shareDisplayName || ''}`}</span>
            </Button>
          )}
          <Button onClick={onNewContent} size="sm" className="gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard.newContent')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
