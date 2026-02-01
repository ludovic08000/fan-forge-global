/**
 * Types pour le système de partenariats
 */

import type { CollaborationType } from '@/types/partnership';

export interface CreatorSearchResult {
  id: string;
  stage_name: string | null;
  user_id: string;
  total_subscribers: number;
  avatar_url: string | null;
  username: string | null;
  display_name: string | null;
  is_verified: boolean;
}

export interface PartnerInfo {
  isRequester: boolean;
  partner: {
    id: string;
    stageName: string | null;
    userId: string;
    profile: {
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
    } | null;
  };
  myShare: number;
  theirShare: number;
}

export const COLLABORATION_TYPES: { value: CollaborationType; label: string; description: string }[] = [
  { value: 'content', label: 'Contenu commun', description: 'Créer du contenu ensemble' },
  { value: 'live', label: 'Lives collaboratifs', description: 'Faire des lives à deux' },
  { value: 'promotion', label: 'Promotion croisée', description: 'Se promouvoir mutuellement' },
  { value: 'exclusive', label: 'Exclusivités', description: 'Contenus exclusifs partagés' },
];
