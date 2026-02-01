import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

type AuditAction = 
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_refunded'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'tip_sent'
  | 'payout_requested'
  | 'payout_processed'
  | 'payout_failed'
  | 'user_banned'
  | 'user_unbanned'
  | 'user_suspended'
  | 'content_moderated'
  | 'content_approved'
  | 'content_rejected'
  | 'content_quarantined'
  | 'admin_action'
  | 'security_block'
  | 'identity_verified'
  | 'identity_rejected'
  | 'stripe_connect_created'
  | 'stripe_connect_updated'
  | 'iban_changed'
  | 'live_started'
  | 'live_ended'
  | 'rate_limit_exceeded';

type TargetType = 
  | 'user'
  | 'creator'
  | 'content'
  | 'subscription'
  | 'payment'
  | 'live_stream'
  | 'message'
  | 'system';

interface AuditLogEntry {
  action: AuditAction;
  adminId?: string;
  userId?: string;
  targetType: TargetType;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an auditable action to the database
 * Used for tracking important actions for security and compliance
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Use admin_id if provided, otherwise use userId as the actor
    const actorId = entry.adminId || entry.userId;

    if (!actorId) {
      console.warn('[AuditLog] No actor ID provided for audit entry:', entry.action);
    }

    const { error } = await supabaseClient
      .from('admin_audit_logs')
      .insert({
        action: entry.action,
        admin_id: actorId || '00000000-0000-0000-0000-000000000000', // System actor if no user
        target_type: entry.targetType,
        target_id: entry.targetId,
        details: entry.details || {},
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      });

    if (error) {
      console.error('[AuditLog] Failed to log audit event:', error);
    } else {
      console.log(`[AuditLog] ${entry.action} logged for ${entry.targetType}:${entry.targetId}`);
    }
  } catch (error) {
    console.error('[AuditLog] Exception logging audit event:', error);
    // Don't throw - audit logging should never break the main flow
  }
}

/**
 * Extract IP and user agent from request headers
 */
export function extractRequestInfo(req: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: req.headers.get("x-forwarded-for") || 
               req.headers.get("x-real-ip") || 
               "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}

/**
 * Log a payment-related event
 */
export async function logPaymentEvent(
  req: Request,
  action: 'payment_initiated' | 'payment_completed' | 'payment_failed' | 'payment_refunded',
  userId: string,
  details: {
    amount?: number;
    currency?: string;
    paymentIntentId?: string;
    creatorId?: string;
    subscriptionId?: string;
    error?: string;
  }
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(req);
  
  await logAuditEvent({
    action,
    userId,
    targetType: 'payment',
    targetId: details.paymentIntentId || details.subscriptionId,
    details: {
      amount: details.amount,
      currency: details.currency,
      creator_id: details.creatorId,
      error: details.error,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Log a payout-related event
 */
export async function logPayoutEvent(
  action: 'payout_requested' | 'payout_processed' | 'payout_failed',
  creatorId: string,
  details: {
    amount: number;
    currency?: string;
    requestId?: string;
    transferId?: string;
    error?: string;
  }
): Promise<void> {
  await logAuditEvent({
    action,
    userId: creatorId,
    targetType: 'creator',
    targetId: creatorId,
    details,
  });
}

/**
 * Log an admin moderation action
 */
export async function logModerationEvent(
  adminId: string,
  action: 'content_approved' | 'content_rejected' | 'content_quarantined' | 'user_banned' | 'user_unbanned' | 'user_suspended',
  targetType: TargetType,
  targetId: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    action,
    adminId,
    targetType,
    targetId,
    details,
  });
}
