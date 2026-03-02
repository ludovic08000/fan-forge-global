import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export const UserBadgesSection: React.FC = () => {
  const { user } = useAuth();

  const { data: allBadges } = useQuery({
    queryKey: ['badge-definitions'],
    queryFn: async () => {
      const { data } = await supabase.from('badge_definitions').select('*').order('category');
      return data || [];
    },
  });

  const { data: myBadges } = useQuery({
    queryKey: ['my-badges', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('user_badges').select('badge_id').eq('user_id', user!.id);
      return data?.map(b => b.badge_id) || [];
    },
  });

  if (!allBadges?.length) return null;

  const categories = [...new Set(allBadges.map(b => b.category))];
  const categoryLabels: Record<string, string> = {
    engagement: '💎 Engagement',
    tipping: '💝 Pourboires',
    social: '💬 Social',
    purchases: '🎯 Achats',
    special: '⭐ Spécial',
    auctions: '🔨 Enchères',
    crowdfunding: '🎁 Crowdfunding',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6" /> Badges & Récompenses
      </h2>

      {categories.map(cat => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{categoryLabels[cat] || cat}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allBadges.filter(b => b.category === cat).map(badge => {
              const earned = myBadges?.includes(badge.id);
              return (
                <Card key={badge.id} className={`transition-all ${earned ? 'border-primary/30 bg-primary/5' : 'opacity-50 grayscale'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <h4 className="font-semibold text-sm">{badge.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    {earned ? (
                      <Badge className="mt-2 text-xs" variant="default">Obtenu ✓</Badge>
                    ) : (
                      <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" /> Verrouillé
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserBadgesSection;
