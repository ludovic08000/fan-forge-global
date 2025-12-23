/**
 * Section affichant les lives en cours en temps réel
 * S'affiche sur la page d'accueil avec mises à jour instantanées
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Circle, Users, Play, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  viewer_count: number | null;
  creator_id: string;
  is_premium: boolean | null;
  price: number | null;
}

interface CreatorInfo {
  id: string;
  stage_name: string | null;
  avatar_url: string | null;
  display_name: string | null;
}

const LiveNowSection = () => {
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [creatorInfos, setCreatorInfos] = useState<Record<string, CreatorInfo>>({});
  const [loading, setLoading] = useState(true);

  // Charger les lives en cours
  const fetchLiveStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('public_live_streams')
        .select('id, title, description, thumbnail_url, viewer_count, creator_id, is_premium, price')
        .eq('status', 'live')
        .order('viewer_count', { ascending: false });

      if (error) throw error;
      setLiveStreams(data || []);
    } catch (error) {
      console.error('[LiveNowSection] Error fetching lives:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les infos des créateurs
  useEffect(() => {
    const loadCreatorInfos = async () => {
      if (liveStreams.length === 0) return;
      
      const creatorIds = [...new Set(liveStreams.map(s => s.creator_id))];
      
      const { data: creators } = await supabase
        .from('public_creators')
        .select('id, stage_name, user_id')
        .in('id', creatorIds);

      if (creators) {
        const userIds = creators.map(c => c.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('public_creator_profiles')
          .select('user_id, avatar_url, display_name')
          .in('user_id', userIds);

        const infos: Record<string, CreatorInfo> = {};
        creators.forEach(creator => {
          const profile = profiles?.find(p => p.user_id === creator.user_id);
          infos[creator.id!] = {
            id: creator.id!,
            stage_name: creator.stage_name,
            avatar_url: profile?.avatar_url || null,
            display_name: profile?.display_name || creator.stage_name || 'Créateur',
          };
        });
        setCreatorInfos(infos);
      }
    };

    loadCreatorInfos();
  }, [liveStreams]);

  // Charger les lives et écouter les changements en temps réel
  useEffect(() => {
    fetchLiveStreams();

    // Subscription temps réel pour les changements sur tous les lives
    const channel = supabase
      .channel('live-now-section-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_streams',
        },
        (payload) => {
          console.log('[LiveNowSection] Realtime update:', payload.eventType);
          // Recharger immédiatement la liste
          fetchLiveStreams();
        }
      )
      .subscribe((status) => {
        console.log('[LiveNowSection] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Ne pas afficher si aucun live
  if (!loading && liveStreams.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="py-8 bg-gradient-to-b from-red-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="relative">
              <Radio className="h-6 w-6 text-red-500" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            </div>
            <h2 className="text-2xl font-bold">En direct maintenant</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 bg-gradient-to-b from-red-500/5 to-transparent">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative p-2 bg-red-500/10 rounded-lg">
              <Radio className="h-6 w-6 text-red-500" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                En direct maintenant
                <Badge variant="destructive" className="animate-pulse">
                  {liveStreams.length} live{liveStreams.length > 1 ? 's' : ''}
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground">Regardez vos créateurs préférés en live</p>
            </div>
          </div>
          <Link to="/lives">
            <Button variant="outline" size="sm">
              Voir tous
            </Button>
          </Link>
        </div>

        {/* Grid des lives */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {liveStreams.map((stream, index) => {
              const creatorInfo = creatorInfos[stream.creator_id];
              
              return (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <Link to={`/live/${stream.id}`}>
                    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-red-500/20">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-red-500/20 to-orange-500/20">
                        {stream.thumbnail_url ? (
                          <img
                            src={stream.thumbnail_url}
                            alt={stream.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="h-12 w-12 text-red-500/50" />
                          </div>
                        )}
                        
                        {/* Badge EN DIRECT */}
                        <div className="absolute top-3 left-3">
                          <Badge variant="destructive" className="gap-1.5 shadow-lg">
                            <Circle className="h-2 w-2 fill-current animate-pulse" />
                            EN DIRECT
                          </Badge>
                        </div>

                        {/* Viewers */}
                        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-sm flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-medium">{stream.viewer_count || 0}</span>
                        </div>

                        {/* Premium badge */}
                        {stream.is_premium && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-amber-500 text-amber-950 shadow-lg">
                              Premium
                            </Badge>
                          </div>
                        )}

                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-red-500/30">
                            <AvatarImage src={creatorInfo?.avatar_url || ''} />
                            <AvatarFallback className="bg-red-500/10 text-red-500">
                              {creatorInfo?.display_name?.charAt(0).toUpperCase() || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold line-clamp-1 group-hover:text-red-500 transition-colors">
                              {stream.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {creatorInfo?.stage_name || creatorInfo?.display_name || 'Créateur'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default LiveNowSection;
