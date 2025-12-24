/**
 * Fonctions de mapping entre les types de base de données et les types métiers
 * Centralisées pour éviter la duplication et garantir la cohérence
 */

import type { Database } from '@/integrations/supabase/types';
import type {
  UserProfile,
  Creator,
  Subscription,
  Content,
  PrivateMessage,
  LiveStream,
  Notification,
  Tip,
  PaymentRequest,
  ReferralCode,
} from '@/types/domain';

// Types de base de données
type DbProfile = Database['public']['Tables']['profiles']['Row'];
type DbCreator = Database['public']['Tables']['creators']['Row'];
type DbSubscription = Database['public']['Tables']['subscriptions']['Row'];
type DbContent = Database['public']['Tables']['content']['Row'];
type DbPrivateMessage = Database['public']['Tables']['private_messages']['Row'];
type DbLiveStream = Database['public']['Tables']['live_streams']['Row'];
type DbNotification = Database['public']['Tables']['notifications']['Row'];
type DbTip = Database['public']['Tables']['tips']['Row'];
type DbPaymentRequest = Database['public']['Tables']['creator_payment_requests']['Row'];
type DbReferralCode = Database['public']['Tables']['referral_codes']['Row'];

/**
 * Mapper un profil de la base de données vers le type métier
 */
export function mapDbProfileToUserProfile(db: DbProfile): UserProfile {
  return {
    id: db.id,
    userId: db.user_id,
    username: db.username,
    displayName: db.display_name,
    avatarUrl: db.avatar_url,
    coverUrl: db.cover_url,
    bio: db.bio,
    location: db.location,
    website: db.website,
    isVerified: db.is_verified ?? false,
    birthdate: db.birthdate,
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}

/**
 * Mapper un créateur de la base de données vers le type métier
 */
export function mapDbCreatorToCreator(db: DbCreator): Creator {
  return {
    id: db.id,
    userId: db.user_id,
    stageName: db.stage_name,
    category: db.category as Creator['category'],
    subscriptionPrice: db.subscription_price ?? 0,
    currency: db.currency ?? 'EUR',
    isFeatured: db.is_featured ?? false,
    totalSubscribers: db.total_subscribers ?? 0,
    totalContent: db.total_content ?? 0,
    isAcceptingTips: db.is_accepting_tips ?? true,
    gender: db.gender as Creator['gender'],
    orientation: db.orientation,
    contentType: (db.content_type ?? []) as Creator['contentType'],
    isPaused: db.is_paused ?? false,
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}

/**
 * Mapper un abonnement de la base de données vers le type métier
 */
export function mapDbSubscriptionToSubscription(db: DbSubscription): Subscription {
  return {
    id: db.id,
    creatorId: db.creator_id,
    subscriberId: db.subscriber_id,
    price: db.price,
    currency: db.currency ?? 'EUR',
    status: db.status ?? 'active',
    autoRenew: db.auto_renew ?? true,
    startDate: db.start_date,
    endDate: db.end_date,
    stripeSubscriptionId: db.stripe_subscription_id,
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}

/**
 * Mapper un contenu de la base de données vers le type métier
 */
export function mapDbContentToContent(db: DbContent): Content {
  return {
    id: db.id,
    creatorId: db.creator_id,
    title: db.title,
    description: db.description,
    contentType: db.content_type,
    fileUrl: db.file_url,
    thumbnailUrl: db.thumbnail_url,
    isPremium: db.is_premium ?? false,
    isPreview: db.is_preview,
    price: db.price ?? 0,
    status: db.status ?? 'published',
    viewCount: db.view_count ?? 0,
    likeCount: db.like_count ?? 0,
    duration: db.duration,
    fileSize: db.file_size,
    tags: db.tags ?? [],
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}

/**
 * Mapper un message privé de la base de données vers le type métier
 */
export function mapDbPrivateMessageToPrivateMessage(db: DbPrivateMessage): PrivateMessage {
  return {
    id: db.id,
    creatorId: db.creator_id,
    subscriberId: db.subscriber_id,
    content: db.content,
    messageType: db.message_type as PrivateMessage['messageType'],
    mediaUrl: db.media_url,
    mediaThumbnail: db.media_thumbnail,
    price: db.price ?? 0,
    isPaid: db.is_paid ?? false,
    stripePaymentIntentId: db.stripe_payment_intent_id,
    createdAt: db.created_at,
  };
}

/**
 * Mapper un live stream de la base de données vers le type métier
 */
export function mapDbLiveStreamToLiveStream(db: DbLiveStream): LiveStream {
  return {
    id: db.id,
    creatorId: db.creator_id,
    title: db.title,
    description: db.description,
    status: (db.status ?? 'scheduled') as LiveStream['status'],
    thumbnailUrl: db.thumbnail_url,
    isPremium: db.is_premium ?? false,
    price: db.price,
    enableRecording: db.enable_recording,
    scheduledAt: db.scheduled_at,
    startedAt: db.started_at,
    endedAt: db.ended_at,
    viewerCount: db.viewer_count ?? 0,
    peakViewerCount: db.peak_viewer_count ?? 0,
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}

/**
 * Mapper une notification de la base de données vers le type métier
 */
export function mapDbNotificationToNotification(db: DbNotification): Notification {
  return {
    id: db.id,
    userId: db.user_id,
    type: db.type as Notification['type'],
    title: db.title,
    message: db.message,
    data: db.data as Record<string, unknown> | null,
    read: db.read ?? false,
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}

/**
 * Mapper un pourboire de la base de données vers le type métier
 */
export function mapDbTipToTip(db: DbTip): Tip {
  return {
    id: db.id,
    creatorId: db.creator_id,
    senderId: db.sender_id,
    amount: db.amount,
    currency: db.currency ?? 'EUR',
    message: db.message,
    contentId: db.content_id,
    stripePaymentIntentId: db.stripe_payment_intent_id,
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}

/**
 * Mapper une demande de paiement de la base de données vers le type métier
 */
export function mapDbPaymentRequestToPaymentRequest(db: DbPaymentRequest): PaymentRequest {
  return {
    id: db.id,
    creatorId: db.creator_id,
    amount: db.amount,
    currency: db.currency,
    status: db.status as PaymentRequest['status'],
    periodStart: db.period_start,
    periodEnd: db.period_end,
    requestedAt: db.requested_at,
    processedAt: db.processed_at,
    stripeTransferId: db.stripe_transfer_id,
    errorMessage: db.error_message,
  };
}

/**
 * Mapper un code de parrainage de la base de données vers le type métier
 */
export function mapDbReferralCodeToReferralCode(db: DbReferralCode): ReferralCode {
  return {
    id: db.id,
    creatorId: db.creator_id,
    code: db.code,
    discountPercentage: db.discount_percentage,
    discountAmount: db.discount_amount,
    maxUses: db.max_uses,
    currentUses: db.current_uses ?? 0,
    expiresAt: db.expires_at,
    isActive: db.is_active ?? true,
    createdAt: db.created_at ?? new Date().toISOString(),
  };
}
