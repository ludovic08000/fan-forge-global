/**
 * Types métiers explicites pour l'application
 * Ces types représentent les entités business et non les types de base de données
 */

// ============================================================
// UTILISATEURS & AUTHENTIFICATION
// ============================================================

export type UserRole = 'admin' | 'creator' | 'subscriber';

export interface UserProfile {
  id: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  isVerified: boolean;
  birthdate: string | null;
  createdAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  profile: UserProfile | null;
}

// ============================================================
// CRÉATEURS
// ============================================================

export type CreatorCategory = 'fitness' | 'music' | 'art' | 'gaming' | 'lifestyle' | 'education' | 'other';
export type Gender = 'male' | 'female' | 'non-binary' | 'other';
export type ContentTypeTag = 'photos' | 'videos' | 'live' | 'audio' | 'text';

export interface Creator {
  id: string;
  userId: string;
  stageName: string | null;
  category: CreatorCategory | null;
  subscriptionPrice: number;
  currency: string;
  isFeatured: boolean;
  totalSubscribers: number;
  totalContent: number;
  isAcceptingTips: boolean;
  gender: Gender | null;
  orientation: string | null;
  contentType: ContentTypeTag[];
  isPaused: boolean;
  createdAt: string;
}

export interface CreatorWithProfile extends Creator {
  profile: UserProfile;
}

export interface CreatorFinancials {
  totalEarnings: number;
  platformCommissionRate: number;
  stripeAccountId: string | null;
  stripeAccountStatus: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeOnboardingCompleted: boolean;
  bankIban: string | null;
  bankBic: string | null;
  bankCountry: string | null;
  bankAccountHolder: string | null;
  taxId: string | null;
  paymentFrequency: string | null;
}

// ============================================================
// ABONNEMENTS
// ============================================================

export type SubscriptionStatus = 'active' | 'expired' | 'canceled';

export interface Subscription {
  id: string;
  creatorId: string;
  subscriberId: string;
  price: number;
  currency: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  startDate: string | null;
  endDate: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

// ============================================================
// CONTENU
// ============================================================

export type ContentType = 'image' | 'video';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface Content {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  contentType: ContentType;
  fileUrl: string;
  thumbnailUrl: string | null;
  isPremium: boolean;
  isPreview: boolean;
  price: number;
  status: ContentStatus;
  viewCount: number;
  likeCount: number;
  duration: number | null;
  fileSize: number | null;
  tags: string[];
  createdAt: string;
}

// ============================================================
// MESSAGERIE PRIVÉE
// ============================================================

export type MessageType = 'text' | 'image' | 'video';

export interface PrivateMessage {
  id: string;
  creatorId: string;
  subscriberId: string;
  content: string | null;
  messageType: MessageType;
  mediaUrl: string | null;
  mediaThumbnail: string | null;
  price: number;
  isPaid: boolean;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  participantStageName: string | null;
  lastMessage: string | null;
  lastMessageType: MessageType;
  lastMessageTime: string;
  unreadCount: number;
  isCreator: boolean;
}

// ============================================================
// LIVE STREAMS
// ============================================================

export type LiveStreamStatus = 'scheduled' | 'live' | 'ended';

export interface LiveStream {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  status: LiveStreamStatus;
  thumbnailUrl: string | null;
  isPremium: boolean;
  price: number | null;
  enableRecording: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  viewerCount: number;
  peakViewerCount: number;
  createdAt: string;
}

export type LiveChatMessageType = 'text' | 'offer' | 'paid_media' | 'tip';

export interface LiveChatMessage {
  id: string;
  liveStreamId: string;
  userId: string;
  username: string;
  message: string;
  messageType: LiveChatMessageType;
  contentOffer: ContentOffer | null;
  paidMedia: PaidMedia | null;
  tipData: TipData | null;
  createdAt: string;
}

export interface ContentOffer {
  contentId: string;
  title: string;
  price: number;
  thumbnailUrl: string | null;
}

export interface PaidMedia {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  price: number;
}

export interface TipData {
  id: string;
  senderId: string;
  senderName: string;
  amount: number;
  currency: string;
  message: string | null;
  createdAt: string;
}

// ============================================================
// PAIEMENTS & FINANCES
// ============================================================

export type PaymentStatus = 'pending' | 'paid' | 'completed' | 'failed';

export interface PaymentRequest {
  id: string;
  creatorId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  periodStart: string;
  periodEnd: string;
  requestedAt: string | null;
  processedAt: string | null;
  stripeTransferId: string | null;
  errorMessage: string | null;
}

export interface Tip {
  id: string;
  creatorId: string;
  senderId: string;
  amount: number;
  currency: string;
  message: string | null;
  contentId: string | null;
  stripePaymentIntentId: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  creatorId: string;
  invoiceNumber: string;
  creatorName: string;
  creatorCountry: string;
  creatorAddress: string | null;
  creatorTaxId: string | null;
  creatorIban: string | null;
  periodStart: string;
  periodEnd: string;
  subscriptionRevenue: number;
  tipsRevenue: number;
  liveRevenue: number;
  privateContentRevenue: number;
  grossAmount: number;
  platformCommissionRate: number;
  platformCommissionAmount: number;
  vatRate: number;
  vatAmount: number;
  netAmount: number;
  currency: string;
  status: 'draft' | 'finalized' | 'paid';
  createdAt: string;
  finalizedAt: string | null;
  paidAt: string | null;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationType = 
  | 'new_message'
  | 'new_subscriber'
  | 'payment_success'
  | 'sale'
  | 'tip_received'
  | 'live_started'
  | 'content_published';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

// ============================================================
// SÉCURITÉ
// ============================================================

export interface BruteForceState {
  blocked: boolean;
  reason: string | null;
  expiresAt: string | null;
  remainingMinutes: number;
  remainingAttempts: number;
  warning: boolean;
  loading: boolean;
}

export interface SecurityBlock {
  id: string;
  identifier: string;
  blockType: 'brute_force' | 'manual';
  reason: string | null;
  expiresAt: string;
  isActive: boolean;
  blockedAt: string;
  createdBy: string | null;
}

// ============================================================
// CODES DE PARRAINAGE
// ============================================================

export interface ReferralCode {
  id: string;
  creatorId: string;
  code: string;
  discountPercentage: number | null;
  discountAmount: number | null;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ============================================================
// ANALYTICS
// ============================================================

export interface CreatorRevenue {
  subscriptionRevenue: number;
  tipsRevenue: number;
  liveRevenue: number;
  privateContentRevenue: number;
  totalBeforeCommission: number;
  commissionAmount: number;
  totalAfterCommission: number;
}

export interface LiveStreamAnalytics {
  totalViewers: number;
  peakViewers: number;
  totalRevenue: number;
  totalTips: number;
  averageViewDuration: number;
  engagementRate: number;
}
