import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PartnershipType = 'collaboration' | 'permanent' | 'affiliation';
export type PartnershipStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Partnership {
  id: string;
  requester_id: string;
  partner_id: string;
  status: string;
  partnership_type?: string;
  revenue_share_requester: number;
  revenue_share_partner: number;
  message?: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  requester?: {
    stage_name: string;
    user_id: string;
  };
  partner?: {
    stage_name: string;
    user_id: string;
  };
  requester_profile?: {
    avatar_url: string;
    username: string;
  };
  partner_profile?: {
    avatar_url: string;
    username: string;
  };
}

export interface ReferralCode {
  id: string;
  creator_id: string;
  code: string;
  commission_rate: number;
  uses_count: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
}

export interface ReferralSubscription {
  id: string;
  referral_code_id: string;
  referrer_creator_id: string;
  referred_user_id: string;
  subscribed_to_creator_id: string;
  subscription_id?: string;
  commission_paid: number;
  created_at: string;
}

export const usePartnerships = (creatorId?: string) => {
  const queryClient = useQueryClient();

  // Fetch partnerships
  const { data: partnerships = [], isLoading: partnershipsLoading } = useQuery({
    queryKey: ['partnerships', creatorId],
    queryFn: async () => {
      if (!creatorId) return [];
      
      // First get partnerships
      const { data, error } = await supabase
        .from('creator_partnerships')
        .select('*')
        .or(`requester_id.eq.${creatorId},partner_id.eq.${creatorId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get creator IDs
      const creatorIds = [...new Set(data.flatMap(p => [p.requester_id, p.partner_id]))];
      
      // Fetch creators
      const { data: creators } = await supabase
        .from('creators')
        .select('id, stage_name, user_id')
        .in('id', creatorIds);

      const creatorMap = new Map(creators?.map(c => [c.id, c]) || []);

      // Get user IDs for profiles
      const userIds = [...new Set(creators?.map(c => c.user_id).filter(Boolean) || [])];

      let profileMap = new Map<string, { avatar_url: string; username: string }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, avatar_url, username')
          .in('user_id', userIds);

        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      return data.map(p => {
        const requester = creatorMap.get(p.requester_id);
        const partner = creatorMap.get(p.partner_id);
        return {
          ...p,
          requester: requester ? { stage_name: requester.stage_name, user_id: requester.user_id } : undefined,
          partner: partner ? { stage_name: partner.stage_name, user_id: partner.user_id } : undefined,
          requester_profile: requester ? profileMap.get(requester.user_id) : undefined,
          partner_profile: partner ? profileMap.get(partner.user_id) : undefined,
        };
      }) as Partnership[];
    },
    enabled: !!creatorId,
  });

  // Fetch referral codes
  const { data: referralCodes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['referral-codes', creatorId],
    queryFn: async () => {
      if (!creatorId) return [];
      
      const { data, error } = await supabase
        .from('creator_referral_codes')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
  });

  // Fetch referral subscriptions
  const { data: referralSubscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['referral-subscriptions', creatorId],
    queryFn: async () => {
      if (!creatorId) return [];
      
      const { data, error } = await supabase
        .from('referral_subscriptions')
        .select('*')
        .eq('referrer_creator_id', creatorId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
  });

  // Create partnership request
  const createPartnershipMutation = useMutation({
    mutationFn: async ({
      partnerId,
      type,
      shareRequester,
      sharePartner,
      message,
    }: {
      partnerId: string;
      type: PartnershipType;
      shareRequester: number;
      sharePartner: number;
      message?: string;
    }) => {
      const { data, error } = await supabase
        .from('creator_partnerships')
        .insert({
          requester_id: creatorId,
          partner_id: partnerId,
          partnership_type: type,
          revenue_share_requester: shareRequester,
          revenue_share_partner: sharePartner,
          message,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      toast.success('Demande de partenariat envoyée');
    },
    onError: (error: any) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  // Update partnership status
  const updatePartnershipMutation = useMutation({
    mutationFn: async ({
      partnershipId,
      status,
    }: {
      partnershipId: string;
      status: PartnershipStatus;
    }) => {
      const updateData: any = { status };
      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('creator_partnerships')
        .update(updateData)
        .eq('id', partnershipId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['partnerships'] });
      const messages = {
        accepted: 'Partenariat accepté !',
        rejected: 'Partenariat refusé',
        cancelled: 'Partenariat annulé',
        pending: 'Statut mis à jour',
      };
      toast.success(messages[status]);
    },
    onError: (error: any) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  // Create referral code
  const createReferralCodeMutation = useMutation({
    mutationFn: async ({
      code,
      commissionRate,
    }: {
      code: string;
      commissionRate: number;
    }) => {
      const { data, error } = await supabase
        .from('creator_referral_codes')
        .insert({
          creator_id: creatorId,
          code: code.toUpperCase(),
          commission_rate: commissionRate,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-codes'] });
      toast.success('Code d\'affiliation créé');
    },
    onError: (error: any) => {
      if (error.message.includes('duplicate')) {
        toast.error('Ce code existe déjà');
      } else {
        toast.error('Erreur: ' + error.message);
      }
    },
  });

  // Toggle referral code active status
  const toggleReferralCodeMutation = useMutation({
    mutationFn: async ({
      codeId,
      isActive,
    }: {
      codeId: string;
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from('creator_referral_codes')
        .update({ is_active: isActive })
        .eq('id', codeId);
      
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['referral-codes'] });
      toast.success(isActive ? 'Code activé' : 'Code désactivé');
    },
    onError: (error: any) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  // Delete referral code
  const deleteReferralCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase
        .from('creator_referral_codes')
        .delete()
        .eq('id', codeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-codes'] });
      toast.success('Code supprimé');
    },
    onError: (error: any) => {
      toast.error('Erreur: ' + error.message);
    },
  });

  return {
    partnerships,
    referralCodes,
    referralSubscriptions,
    isLoading: partnershipsLoading || codesLoading || subsLoading,
    createPartnership: createPartnershipMutation.mutate,
    updatePartnership: updatePartnershipMutation.mutate,
    createReferralCode: createReferralCodeMutation.mutate,
    toggleReferralCode: toggleReferralCodeMutation.mutate,
    deleteReferralCode: deleteReferralCodeMutation.mutate,
    isCreatingPartnership: createPartnershipMutation.isPending,
    isCreatingCode: createReferralCodeMutation.isPending,
  };
};
