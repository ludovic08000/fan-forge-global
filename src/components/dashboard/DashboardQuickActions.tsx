import React from 'react';
import { Upload, Radio, MessageCircle, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardSection } from './DashboardNav';
import { useTranslation } from '@/contexts/TranslationContext';

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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all"
        onClick={onNewContent}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold mb-1">{t('dashboard.newContent')}</h3>
        <p className="text-xs text-muted-foreground">{t('dashboard.photosVideos')}</p>
      </div>

      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-500/5 transition-all"
        onClick={() => onSectionChange('live')}
      >
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Radio className="h-6 w-6 text-rose-500" />
        </div>
        <h3 className="font-semibold mb-1">{t('dashboard.startLive')}</h3>
        <p className="text-xs text-muted-foreground">{t('dashboard.directStreaming')}</p>
      </div>

      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
        onClick={() => onSectionChange('messages')}
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <MessageCircle className="h-6 w-6 text-blue-500" />
        </div>
        <h3 className="font-semibold mb-1">{t('dashboard.messages')}</h3>
        <p className="text-xs text-muted-foreground">{t('dashboard.chatWithFans')}</p>
      </div>

      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all"
        onClick={() => navigate('/partnerships')}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Handshake className="h-6 w-6 text-purple-500" />
        </div>
        <h3 className="font-semibold mb-1 text-purple-600 dark:text-purple-400">{t('dashboard.partnerships')}</h3>
        <p className="text-xs text-muted-foreground">{t('dashboard.collaborateEarnMore')}</p>
      </div>
    </div>
  );
};

export default DashboardQuickActions;
