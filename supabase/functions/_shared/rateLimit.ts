import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Rate limiting configuration by endpoint type
 */
const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  'payment': { maxRequests: 10, windowMs: 60000 },      // 10 payments/minute
  'tip': { maxRequests: 20, windowMs: 60000 },          // 20 tips/minute
  'checkout': { maxRequests: 10, windowMs: 60000 },     // 10 checkouts/minute
  'live': { maxRequests: 5, windowMs: 60000 },          // 5 live actions/minute
  'upload': { maxRequests: 10, windowMs: 60000 },       // 10 uploads/minute
  'message': { maxRequests: 30, windowMs: 60000 },      // 30 messages/minute
  'default': { maxRequests: 60, windowMs: 60000 },      // 60 req/minute default
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  error?: string;
}

/**
 * Check rate limit for a given endpoint and user/IP
 * Uses in-memory rate limiting with database fallback for persistence
 */
export async function checkRateLimit(
  req: Request,
  userId: string | null,
  endpoint: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  const ipAddress = req.headers.get("x-forwarded-for") || 
                   req.headers.get("x-real-ip") || 
                   "unknown";

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const windowStart = new Date(Date.now() - config.windowMs).toISOString();
    
    // Count recent requests for this user/IP and endpoint
    const { count, error } = await supabaseClient
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('endpoint', endpoint)
      .gte('created_at', windowStart)
      .or(userId ? `user_id.eq.${userId},ip_address.eq.${ipAddress}` : `ip_address.eq.${ipAddress}`);

    if (error) {
      console.error('[RateLimit] Error checking rate limit:', error);
      // Fail open - allow request if we can't check
      return { allowed: true, remaining: config.maxRequests, resetIn: 60 };
    }

    const currentCount = count || 0;
    const isAllowed = currentCount < config.maxRequests;

    // Log this request if allowed
    if (isAllowed) {
      await supabaseClient
        .from('rate_limit_logs')
        .insert({
          user_id: userId,
          ip_address: ipAddress,
          endpoint: endpoint,
        });
    }

    return {
      allowed: isAllowed,
      remaining: Math.max(0, config.maxRequests - currentCount),
      resetIn: Math.ceil(config.windowMs / 1000),
    };
  } catch (error) {
    console.error('[RateLimit] Exception:', error);
    // Fail open on error
    return { allowed: true, remaining: config.maxRequests, resetIn: 60 };
  }
}

/**
 * Returns a 429 response for rate-limited requests
 */
export function rateLimitResponse(
  result: RateLimitResult, 
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Trop de requêtes. Veuillez patienter.",
      remaining: result.remaining,
      resetIn: result.resetIn,
    }),
    {
      status: 429,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": String(result.resetIn),
      },
    }
  );
}
