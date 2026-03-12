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
    <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
      {/* Avatar + name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-primary/20 ring-offset-1 ring-offset-background">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-xs sm:text-sm">
              {user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-[1.5px] border-background" />
        </div>
        <p className="text-sm sm:text-base font-semibold text-foreground truncate">
          {user.user_metadata?.stage_name || user.user_metadata?.display_name || user.user_metadata?.username || ''}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {shareLink && (
          <Button
            onClick={onCopyLink}
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm hover:bg-accent/80 hover:border-primary/30 transition-all shadow-sm"
            title={shareDisplayName || shareLink}
          >
            {copied ? <Copy className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4 text-muted-foreground" />}
          </Button>
        )}
        <Button
          onClick={onNewContent}
          size="icon"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all"
        >
          <Plus className="h-4 w-4 text-primary-foreground" />
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
