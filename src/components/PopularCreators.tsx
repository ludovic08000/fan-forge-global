import React, { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PopularCreatorCard from './PopularCreatorCard';
import { SearchCreator } from '@/hooks/useSearch';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const PopularCreators = () => {
  const { data: creators, isLoading } = useQuery({
    queryKey: ['popular-creators'],
    queryFn: async () => {
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('public_creators')
        .select('*')
        .order('total_subscribers', { ascending: false })
        .limit(12);

      if (creatorsError) throw creatorsError;
      if (!creatorsData || creatorsData.length === 0) return [];

      const userIds = creatorsData.map(c => c.user_id).filter(Boolean) as string[];
      const { data: profilesData } = await supabase
        .from('public_creator_profiles')
        .select('user_id, display_name, username, avatar_url, bio, is_verified')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

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
      <section className="py-16 bg-gradient-to-b from-background to-muted/20" aria-label="Chargement des créateurs populaires">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Créateurs populaires</h2>
                <p className="text-muted-foreground text-sm mt-1">Découvrez les talents du moment</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="status" aria-label="Chargement">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <Skeleton className="h-28 w-full" />
                <div className="p-5 pt-16 space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </div>
              </div>
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
    <section className="py-16 bg-gradient-to-b from-background via-background to-muted/30" aria-labelledby="popular-creators-heading">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl" />
              <div className="relative p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 backdrop-blur-sm">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h2 id="popular-creators-heading" className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                Créateurs populaires
                <Sparkles className="h-5 w-5 text-amber-500" />
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Découvrez les talents les plus suivis
              </p>
            </div>
          </div>
          
          <Link to="/search">
            <Button variant="outline" className="hidden sm:flex items-center gap-2 group hover:border-primary/50 transition-all">
              <Users className="h-4 w-4 group-hover:text-primary transition-colors" aria-hidden="true" />
              <span className="group-hover:text-primary transition-colors">Voir tous</span>
            </Button>
          </Link>
        </motion.div>

        {/* Grid */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          role="list"
          aria-label="Liste des créateurs populaires"
        >
          {creators.map((creator, index) => (
            <div key={creator.id} role="listitem">
              <PopularCreatorCard creator={creator} index={index} />
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <motion.div 
          className="mt-10 text-center sm:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/search">
            <Button className="w-full bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20">
              <Users className="h-4 w-4 mr-2" aria-hidden="true" />
              Voir tous les créateurs
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default memo(PopularCreators);
