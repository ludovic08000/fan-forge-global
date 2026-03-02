/**
 * Section enchères dans le dashboard créateur
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gavel, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreateAuctionDialog } from './CreateAuctionDialog';
import { AuctionCard } from './AuctionCard';

interface CreatorAuctionsSectionProps {
  creatorId: string;
}

export const CreatorAuctionsSection: React.FC<CreatorAuctionsSectionProps> = ({ creatorId }) => {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['creator-auctions', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_auctions')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleCancel = async (auctionId: string) => {
    if (!confirm('Annuler cette enchère ? Les enchérisseurs seront notifiés.')) return;
    try {
      const { error } = await supabase
        .from('content_auctions')
        .update({ status: 'cancelled' })
        .eq('id', auctionId);
      if (error) throw error;
      toast.success('Enchère annulée');
      queryClient.invalidateQueries({ queryKey: ['creator-auctions'] });
    } catch {
      toast.error('Erreur');
    }
  };

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['creator-auctions'] });

  // Realtime
  React.useEffect(() => {
    const channel = supabase
      .channel('creator-auctions-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_auctions',
        filter: `creator_id=eq.${creatorId}`,
      }, () => refetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [creatorId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            Enchères
          </h2>
          <p className="text-sm text-muted-foreground">
            Mettez du contenu exclusif aux enchères pour maximiser vos revenus
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle enchère
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !auctions?.length ? (
        <div className="text-center py-16 space-y-4">
          <Gavel className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <div>
            <h3 className="text-lg font-semibold">Aucune enchère</h3>
            <p className="text-sm text-muted-foreground">
              Créez votre première enchère pour proposer du contenu exclusif au plus offrant !
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Créer une enchère
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {auctions.map(auction => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              isCreator
              onCancel={() => handleCancel(auction.id)}
              onBidPlaced={refetch}
            />
          ))}
        </div>
      )}

      <CreateAuctionDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        creatorId={creatorId}
        onCreated={refetch}
      />
    </div>
  );
};

export default CreatorAuctionsSection;
