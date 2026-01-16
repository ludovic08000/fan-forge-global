import React from 'react';
import { Euro, Users, Eye, Heart } from 'lucide-react';

interface CreatorStats {
  totalEarnings: number;
  totalSubscribers: number;
  totalViews: number;
  totalLikes: number;
}

interface DashboardStatsProps {
  stats: CreatorStats;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all hover:shadow-xl hover:shadow-emerald-500/10">
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
        <Euro className="h-7 w-7 text-emerald-500 mb-3" />
        <p className="text-3xl font-bold text-emerald-500">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.totalEarnings)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">Revenus totaux</p>
      </div>

      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent p-5 border border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-xl hover:shadow-blue-500/10">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
        <Users className="h-7 w-7 text-blue-500 mb-3" />
        <p className="text-3xl font-bold text-blue-500">{stats.totalSubscribers}</p>
        <p className="text-sm text-muted-foreground mt-1">Abonnés actifs</p>
      </div>

      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-transparent p-5 border border-violet-500/20 hover:border-violet-500/40 transition-all hover:shadow-xl hover:shadow-violet-500/10">
        <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
        <Eye className="h-7 w-7 text-violet-500 mb-3" />
        <p className="text-3xl font-bold text-violet-500">{stats.totalViews}</p>
        <p className="text-sm text-muted-foreground mt-1">Vues totales</p>
      </div>

      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-transparent p-5 border border-rose-500/20 hover:border-rose-500/40 transition-all hover:shadow-xl hover:shadow-rose-500/10">
        <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
        <Heart className="h-7 w-7 text-rose-500 mb-3" />
        <p className="text-3xl font-bold text-rose-500">{stats.totalLikes}</p>
        <p className="text-sm text-muted-foreground mt-1">Likes reçus</p>
      </div>
    </div>
  );
};

export default DashboardStats;
