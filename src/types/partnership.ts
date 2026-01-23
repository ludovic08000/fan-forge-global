/**
 * Types pour le système de partenariats entre créateurs
 */

export type PartnershipStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
export type CollaborationType = 'content' | 'live' | 'promotion' | 'exclusive';
export type PartnershipRevenueType = 'subscription' | 'tip' | 'private_content' | 'live';

export interface Partnership {
  id: string;
  requesterId: string;
  partnerId: string;
  status: PartnershipStatus;
  revenueShareRequester: number;
  revenueSharePartner: number;
  message: string | null;
  collaborationType: CollaborationType[];
  createdAt: string;
  acceptedAt: string | null;
  updatedAt: string;
}

export interface PartnershipWithProfiles extends Partnership {
  requester: PartnerProfile;
  partner: PartnerProfile;
}

export interface PartnerProfile {
  id: string;
  stageName: string | null;
  userId: string;
  profile: {
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  } | null;
}

export interface CollaborativeContent {
  id: string;
  contentId: string;
  partnershipId: string;
  primaryCreatorId: string;
  createdAt: string;
}

export interface PartnershipRevenue {
  id: string;
  partnershipId: string;
  contentId: string | null;
  totalAmount: number;
  requesterShare: number;
  partnerShare: number;
  currency: string;
  revenueType: PartnershipRevenueType;
  createdAt: string;
}

export interface PartnershipRevenueStats {
  totalRevenue: number;
  myShare: number;
  partnerShare: number;
  byType: {
    subscription: number;
    tip: number;
    private_content: number;
    live: number;
  };
}

export interface CreatePartnershipRequest {
  partnerId: string;
  revenueShareRequester: number;
  revenueSharePartner: number;
  message?: string;
  collaborationType: CollaborationType[];
}
