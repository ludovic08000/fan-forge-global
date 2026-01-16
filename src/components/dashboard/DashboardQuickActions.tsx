import React from 'react';
import { Upload, Radio, MessageCircle, Sparkles } from 'lucide-react';
import { DashboardSection } from './DashboardNav';

interface DashboardQuickActionsProps {
  onNewContent: () => void;
  onSectionChange: (section: DashboardSection) => void;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({
  onNewContent,
  onSectionChange,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all"
        onClick={onNewContent}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold mb-1">Nouveau contenu</h3>
        <p className="text-xs text-muted-foreground">Photos & vidéos</p>
      </div>

      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-500/5 transition-all"
        onClick={() => onSectionChange('live')}
      >
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Radio className="h-6 w-6 text-rose-500" />
        </div>
        <h3 className="font-semibold mb-1">Lancer un Live</h3>
        <p className="text-xs text-muted-foreground">Streaming direct</p>
      </div>

      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
        onClick={() => onSectionChange('messages')}
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <MessageCircle className="h-6 w-6 text-blue-500" />
        </div>
        <h3 className="font-semibold mb-1">Messages</h3>
        <p className="text-xs text-muted-foreground">Discuter avec vos fans</p>
      </div>

      <div 
        className="group cursor-pointer p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all"
        onClick={() => onSectionChange('pricing')}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Sparkles className="h-6 w-6 text-amber-500" />
        </div>
        <h3 className="font-semibold mb-1 text-amber-600 dark:text-amber-400">Booster</h3>
        <p className="text-xs text-muted-foreground">Visibilité premium</p>
      </div>
    </div>
  );
};

export default DashboardQuickActions;
