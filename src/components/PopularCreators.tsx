import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CreatorSearchCard from './CreatorSearchCard';
import { SearchCreator } from '@/hooks/useSearch';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PopularCreators = () => {
  const { data: creators, isLoading } = useQuery({
    queryKey: ['popular-creators'],
    queryFn: async () => {
      // Récupérer les créateurs triés par nombre d'abonnés via la vue publique
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('public_creators')
        .select('*')
        .order('total_subscribers', { ascending: false })
        .limit(12);

      if (creatorsError) throw creatorsError;
      if (!creatorsData || creatorsData.length === 0) return [];

      // Récupérer les profils associés via la vue publique
      const userIds = creatorsData.map(c => c.user_id).filter(Boolean) as string[];
      const { data: profilesData } = await supabase
        .from('public_creator_profiles')
        .select('user_id, display_name, username, avatar_url, bio, is_verified')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Combiner les données
      const combinedCreators: SearchCreator[] = creatorsData.map(creator => {
        const profile = profilesMap.get(creator.user_id);
        return {
          id: creator.id,
          user_id: creator.user_id,
          stage_name: creator.stage_name || '',
          category: creator.category || '',
          subscription_price: creator.subscription_price || 0,
          currency: creator.currency || 'EUR',
          is_featured: creator.is_featured || false,
          total_subscribers: creator.total_subscribers || 0,
          total_content: creator.total_content || 0,
          created_at: creator.created_at || '',
          display_name: profile?.display_name || '',
          username: profile?.username || '',
          avatar_url: profile?.avatar_url || '',
          bio: profile?.bio || '',
          is_verified: profile?.is_verified || false,
          similarity_score: 1,
          gender: creator.gender || '',
          orientation: creator.orientation || '',
          content_type: creator.content_type || []
        };
      });

      return combinedCreators;
    }
  });

  if (isLoading) {
    return (
      <section className="py-12 bg-background" aria-label="Chargement des créateurs populaires">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-2xl md:text-3xl font-bold">Créateurs populaires</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Chargement">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!creators || creators.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-background" aria-labelledby="popular-creators-heading">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg" aria-hidden="true">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 id="popular-creators-heading" className="text-2xl md:text-3xl font-bold">Créateurs populaires</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Découvrez les créateurs les plus suivis de la plateforme
              </p>
            </div>
          </div>
          <Link to="/search">
            <Button variant="outline" className="hidden sm:flex items-center gap-2">
              <Users className="h-4 w-4" aria-hidden="true" />
              Voir tous
            </Button>
          </Link>
        </div>

        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="list"
          aria-label="Liste des créateurs populaires"
        >
          {creators.map((creator) => (
            <div key={creator.id} role="listitem">
              <CreatorSearchCard creator={creator} />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/search">
            <Button variant="outline" className="w-full">
              <Users className="h-4 w-4 mr-2" aria-hidden="true" />
              Voir tous les créateurs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default memo(PopularCreators);
