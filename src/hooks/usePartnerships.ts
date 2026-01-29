/**
 * Hook pour gérer les partenariats entre créateurs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  Partnership, 
  PartnershipWithProfiles, 
  CreatePartnershipRequest,
  PartnershipRevenueStats,
  CollaborationType 
} from '@/types/partnership';

interface PartnershipRow {
  id: string;
  requester_id: string;
  partner_id: string;
  status: string;
  revenue_share_requester: number;
  revenue_share_partner: number;
  message: string | null;
  collaboration_type: string[] | null;
  created_at: string;
  accepted_at: string | null;
  updated_at: string;
  requester?: CreatorWithProfile;
  partner?: CreatorWithProfile;
}

interface CreatorWithProfile {
  id: string;
  stage_name: string | null;
  user_id: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
  } | null;
}

const mapPartnership = (row: PartnershipRow): Partnership => ({
  id: row.id,
  requesterId: row.requester_id,
  partnerId: row.partner_id,
  status: row.status as Partnership['status'],
  revenueShareRequester: Number(row.revenue_share_requester),
  revenueSharePartner: Number(row.revenue_share_partner),
  message: row.message,
  collaborationType: (row.collaboration_type || ['content']) as CollaborationType[],
  createdAt: row.created_at,
  acceptedAt: row.accepted_at,
  updatedAt: row.updated_at,
});

const mapPartnershipWithProfiles = (row: PartnershipRow): PartnershipWithProfiles => ({
  ...mapPartnership(row),
  requester: {
    id: row.requester?.id || '',
    stageName: row.requester?.stage_name || null,
    userId: row.requester?.user_id || '',
    profile: row.requester?.profiles ? {
      username: row.requester.profiles.username,
      displayName: row.requester.profiles.display_name,
      avatarUrl: row.requester.profiles.avatar_url,
      isVerified: row.requester.profiles.is_verified || false,
    } : null,
  },
  partner: {
    id: row.partner?.id || '',
    stageName: row.partner?.stage_name || null,
    userId: row.partner?.user_id || '',
    profile: row.partner?.profiles ? {
      username: row.partner.profiles.username,
      displayName: row.partner.profiles.display_name,
      avatarUrl: row.partner.profiles.avatar_url,
      isVerified: row.partner.profiles.is_verified || false,
    } : null,
  },
});

export const usePartnerships = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Récupérer le creator_id ET les partenariats en une seule requête combinée
  const { data: combinedData, isLoading: combinedLoading } = useQuery({
    queryKey: ['partnerships-combined', user?.id],
    queryFn: async () => {
      if (!user) return { creator: null, partnerships: [] };
      
      // Requête 1: Récupérer le creator_id
      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (creatorError) throw creatorError;
      if (!creatorData) return { creator: null, partnerships: [] };
      
      // Requête 2: Récupérer les partenariats
      const { data: partnershipsData, error: partnershipsError } = await supabase
        .from('creator_partnerships')
        .select(`
          *,
          requester:requester_id(id, stage_name, user_id, profiles:user_id(username, display_name, avatar_url, is_verified)),
          partner:partner_id(id, stage_name, user_id, profiles:user_id(username, display_name, avatar_url, is_verified))
        `)
        .or(`requester_id.eq.${creatorData.id},partner_id.eq.${creatorData.id}`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (partnershipsError) throw partnershipsError;
      
      return {
        creator: creatorData,
        partnerships: (partnershipsData as unknown as PartnershipRow[]).map(mapPartnershipWithProfiles),
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Affichage instantané des anciennes données
  });

  const currentCreator = combinedData?.creator ?? null;
  const partnerships = combinedData?.partnerships ?? [];
  const isLoading = combinedLoading;

  // Demandes reçues en attente
  const pendingReceived = partnerships?.filter(
    p => p.status === 'pending' && p.partnerId === currentCreator?.id
  ) || [];

  // Demandes envoyées en attente
  const pendingSent = partnerships?.filter(
    p => p.status === 'pending' && p.requesterId === currentCreator?.id
  ) || [];

  // Partenariats actifs
  const activePartnerships = partnerships?.filter(p => p.status === 'accepted') || [];

  // Créer une demande de partenariat
  const createPartnership = useMutation({
    mutationFn: async (request: CreatePartnershipRequest) => {
      if (!currentCreator?.id) throw new Error('Vous devez être créateur');
      
      const { data, error } = await supabase
        .from('creator_partnerships')
        .insert({
          requester_id: currentCreator.id,
          partner_id: request.partnerId,
          revenue_share_requester: request.revenueShareRequester,
          revenue_share_partner: request.revenueSharePartner,
          message: request.message || null,
          collaboration_type: request.collaborationType,
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Une demande de partenariat existe déjà avec ce créateur');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Demande de partenariat envoyée !');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Accepter un partenariat
  const acceptPartnership = useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from('creator_partnerships')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', partnershipId)
        .eq('partner_id', currentCreator?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Partenariat accepté !');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'acceptation');
    },
  });

  // Refuser un partenariat
  const rejectPartnership = useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from('creator_partnerships')
        .update({ status: 'rejected' })
        .eq('id', partnershipId)
        .eq('partner_id', currentCreator?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Partenariat refusé');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
    onError: () => {
      toast.error('Erreur lors du refus');
    },
  });

  // Annuler un partenariat (par le demandeur)
  const cancelPartnership = useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from('creator_partnerships')
        .delete()
        .eq('id', partnershipId)
        .eq('requester_id', currentCreator?.id)
        .eq('status', 'pending');
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demande annulée');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'annulation');
    },
  });

  // Terminer un partenariat actif
  const endPartnership = useMutation({
    mutationFn: async (partnershipId: string) => {
      const { error } = await supabase
        .from('creator_partnerships')
        .update({ status: 'cancelled' })
        .eq('id', partnershipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Partenariat terminé');
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
    },
    onError: () => {
      toast.error('Erreur lors de la terminaison');
    },
  });

  // Récupérer les revenus d'un partenariat
  const usePartnershipRevenue = (partnershipId: string) => {
    return useQuery({
      queryKey: ['partnership-revenue', partnershipId],
      queryFn: async (): Promise<PartnershipRevenueStats> => {
        const { data, error } = await supabase
          .from('partnership_revenue')
          .select('*')
          .eq('partnership_id', partnershipId);
        
        if (error) throw error;
        
        const stats: PartnershipRevenueStats = {
          totalRevenue: 0,
          myShare: 0,
          partnerShare: 0,
          byType: {
            subscription: 0,
            tip: 0,
            private_content: 0,
            live: 0,
          },
        };

        // Trouver le partenariat pour savoir qui est qui
        const partnership = partnerships?.find(p => p.id === partnershipId);
        const isRequester = partnership?.requesterId === currentCreator?.id;
        
        data?.forEach(rev => {
          stats.totalRevenue += Number(rev.total_amount);
          stats.myShare += isRequester ? Number(rev.requester_share) : Number(rev.partner_share);
          stats.partnerShare += isRequester ? Number(rev.partner_share) : Number(rev.requester_share);
          
          const type = rev.revenue_type as keyof typeof stats.byType;
          if (stats.byType[type] !== undefined) {
            stats.byType[type] += Number(rev.total_amount);
          }
        });
        
        return stats;
      },
      enabled: !!partnershipId && !!partnerships,
    });
  };

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['partnerships-combined'] });

  return {
    currentCreatorId: currentCreator?.id,
    isCreator: !!currentCreator,
    isCreatorLoading: isLoading,
    partnerships,
    pendingReceived,
    pendingSent,
    activePartnerships,
    isLoading,
    refetch,
    createPartnership,
    acceptPartnership,
    rejectPartnership,
    cancelPartnership,
    endPartnership,
    usePartnershipRevenue,
  };
};

export default usePartnerships;
