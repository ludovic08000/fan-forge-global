import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Eye, ExternalLink, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PopularCreator {
  id: string;
  user_id: string;
  stage_name: string | null;
  total_subscribers: number | null;
  total_content: number | null;
  subscription_price: number | null;
  currency: string | null;
  category: string | null;
  is_featured: boolean | null;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
  };
  total_views: number;
}

const PopularProfiles = () => {
  const [creators, setCreators] = useState<PopularCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPopularCreators();
  }, []);

  const loadPopularCreators = async () => {
    try {
      setLoading(true);
      
      // Récupérer les créateurs avec leurs profils
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('creators')
        .select('id, user_id, stage_name, total_subscribers, total_content, subscription_price, currency, category, is_featured')
        .order('total_subscribers', { ascending: false })
        .limit(50);

      if (creatorsError) throw creatorsError;

      // Récupérer les profils associés
      const userIds = creatorsData?.map(c => c.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url, is_verified')
        .in('user_id', userIds);

      // Calculer les vues totales pour chaque créateur
      const creatorsWithViews = await Promise.all(
        (creatorsData || []).map(async (creator) => {
          // Compter les vues du contenu de ce créateur
          const { count } = await supabase
            .from('content_views')
            .select('id', { count: 'exact', head: true })
            .in('content_id', 
              (await supabase
                .from('content')
                .select('id')
                .eq('creator_id', creator.id)
              ).data?.map(c => c.id) || []
            );

          const profile = profilesData?.find(p => p.user_id === creator.user_id);
          
          return {
            ...creator,
            profile,
            total_views: count || 0
          };
        })
      );

      // Trier par vues totales
      creatorsWithViews.sort((a, b) => b.total_views - a.total_views);
      
      setCreators(creatorsWithViews);
    } catch (error) {
      console.error('Erreur chargement créateurs populaires:', error);
      toast.error('Erreur lors du chargement des créateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (username: string | null | undefined) => {
    if (username) {
      // Ouvrir dans un nouvel onglet pour éviter de perdre le contexte admin
      window.open(`/${username}`, '_blank');
    } else {
      toast.error('Profil non disponible');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profils les plus vus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Profils les plus populaires
        </CardTitle>
        <CardDescription>
          Vue d'ensemble des créateurs les plus actifs et visités - Accès direct sans abonnement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Créateur</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-4 w-4" />
                  Vues
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-4 w-4" />
                  Abonnés
                </div>
              </TableHead>
              <TableHead className="text-center">Contenus</TableHead>
              <TableHead className="text-center">Prix</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creators.map((creator) => (
              <TableRow key={creator.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={creator.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(creator.stage_name || creator.profile?.display_name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {creator.stage_name || creator.profile?.display_name || 'Anonyme'}
                        {creator.profile?.is_verified && (
                          <Badge variant="secondary" className="text-xs">Vérifié</Badge>
                        )}
                        {creator.is_featured && (
                          <Badge variant="default" className="text-xs">Featured</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{creator.profile?.username || 'inconnu'}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {creator.category ? (
                    <Badge variant="outline">{creator.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {creator.total_views.toLocaleString()}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {(creator.total_subscribers || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {creator.total_content || 0}
                </TableCell>
                <TableCell className="text-center">
                  {creator.subscription_price ? (
                    <span className="font-medium">
                      {creator.subscription_price}€
                    </span>
                  ) : (
                    <Badge variant="secondary">Gratuit</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProfile(creator.profile?.username)}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir profil
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {creators.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun créateur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PopularProfiles;
