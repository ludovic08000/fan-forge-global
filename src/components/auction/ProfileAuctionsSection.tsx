/**
 * Section enchères sur le profil public du créateur (côté abonné)
 */
import React from 'react';
import { Gavel, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuctionCard } from './AuctionCard';

interface ProfileAuctionsSectionProps {
  creatorId: string;
}

export const ProfileAuctionsSection: React.FC<ProfileAuctionsSectionProps> = ({ creatorId }) => {
  const queryClient = useQueryClient();

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['profile-auctions', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_auctions')
        .select('*')
        .eq('creator_id', creatorId)
        .in('status', ['active', 'ended'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['profile-auctions'] });

  // Realtime pour les mises à jour en temps réel
  React.useEffect(() => {
    const channel = supabase
      .channel('profile-auctions-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_auctions',
        filter: `creator_id=eq.${creatorId}`,
      }, () => refetch())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'auction_bids',
      }, () => refetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [creatorId]);

  if (isLoading) return null;
  if (!auctions?.length) return null;

  const activeAuctions = auctions.filter(a => a.status === 'active' && new Date(a.ends_at) > new Date());
  if (!activeAuctions.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <Gavel className="h-5 w-5 text-primary" />
        Enchères en cours
        <span className="text-sm font-normal text-muted-foreground">
          ({activeAuctions.length})
        </span>
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {activeAuctions.map(auction => (
          <AuctionCard
            key={auction.id}
            auction={auction}
            onBidPlaced={refetch}
          />
        ))}
      </div>
    </div>
  );
};

export default ProfileAuctionsSection;
