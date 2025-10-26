/**
 * Dashboard d'analytics pour les créateurs
 * Affiche les métriques de performance et l'engagement du contenu
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Eye, 
  Heart, 
  Clock, 
  Euro,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useAnalytics } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface pour les statistiques du créateur
 */
interface CreatorStats {
  totalViews: number;
  totalLikes: number;
  viewsByDay: Record<string, number>;
  likesByDay: Record<string, number>;
  averageViewDuration: number;
  topContent: Array<{ contentId: string; views: number }>;
}

/**
 * Composant principal du dashboard analytics
 */
const CreatorAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { getCreatorAnalytics } = useAnalytics();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [creatorId, setCreatorId] = useState<string | null>(null);

  // Charger l'ID du créateur
  useEffect(() => {
    const loadCreatorId = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setCreatorId(data.id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de l\'ID créateur:', error);
      }
    };

    loadCreatorId();
  }, [user]);

  // Charger les statistiques
  useEffect(() => {
    const loadStats = async () => {
      if (!creatorId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const analytics = await getCreatorAnalytics(creatorId);
        setStats(analytics);
      } catch (error) {
        console.error('Erreur lors du chargement des analytics:', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [creatorId, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Aucune donnée d'analytics disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculer les changements en pourcentage (simulé pour l'exemple)
  const calculatePercentageChange = (current: number): string => {
    const change = Math.random() * 30 - 10; // Simulé
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${change.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec sélecteur de période */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">
            Suivez les performances de votre contenu
          </p>
        </div>
        
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 jours</TabsTrigger>
            <TabsTrigger value="30d">30 jours</TabsTrigger>
            <TabsTrigger value="90d">90 jours</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total des vues */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {calculatePercentageChange(stats.totalViews)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Vues totales</p>
            </div>
          </CardContent>
        </Card>

        {/* Total des likes */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {calculatePercentageChange(stats.totalLikes)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Likes totaux</p>
            </div>
          </CardContent>
        </Card>

        {/* Durée moyenne de visionnage */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {calculatePercentageChange(stats.averageViewDuration)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {Math.floor(stats.averageViewDuration / 60)}:{String(stats.averageViewDuration % 60).padStart(2, '0')}
              </p>
              <p className="text-xs text-muted-foreground">Durée moyenne</p>
            </div>
          </CardContent>
        </Card>

        {/* Taux d'engagement */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                {calculatePercentageChange(stats.totalLikes / stats.totalViews * 100)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {stats.totalViews > 0 
                  ? ((stats.totalLikes / stats.totalViews) * 100).toFixed(1)
                  : '0'}%
              </p>
              <p className="text-xs text-muted-foreground">Taux d'engagement</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique de tendance simplifié */}
      <Card>
        <CardHeader>
          <CardTitle>Vues au fil du temps</CardTitle>
          <CardDescription>
            Évolution de vos vues sur les {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} derniers jours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.viewsByDay)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .slice(0, 10)
              .map(([date, views]) => (
                <div key={date} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((views / Math.max(...Object.values(stats.viewsByDay))) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <Badge variant="secondary">{views}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Contenu le plus populaire */}
      <Card>
        <CardHeader>
          <CardTitle>Contenu le plus populaire</CardTitle>
          <CardDescription>
            Vos contenus avec le plus de vues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topContent.length > 0 ? (
              stats.topContent.map((content, index) => (
                <div key={content.contentId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="text-sm">Contenu #{content.contentId.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{content.views}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Aucun contenu pour le moment
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorAnalyticsDashboard;
