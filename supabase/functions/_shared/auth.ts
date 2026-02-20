import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Validates a JWT token using Supabase's auth.getClaims()
 * This properly verifies the cryptographic signature of the token.
 * 
 * NO FALLBACK - If verification fails, authentication is rejected.
 * This prevents signature bypass attacks.
 */
export async function validateJwtAndGetUserId(authHeader: string | null): Promise<{
  userId: string | null;
  error: string | null;
  statusCode: number;
}> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { userId: null, error: 'Authorization required', statusCode: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // Create client with the user's token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  // Use getUser() for server-side token verification
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('[Auth] getUser failed:', error?.message);
      return { userId: null, error: 'Invalid token', statusCode: 401 };
    }

    return { userId: user.id, error: null, statusCode: 200 };
  } catch (e) {
    console.error('[Auth] Token verification failed:', e);
    return { userId: null, error: 'Authentication failed', statusCode: 401 };
  }
}

/**
 * Verify a cron secret for cleanup/admin functions
 */
export function verifyCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.warn('[Auth] CRON_SECRET not configured - rejecting cron request');
    return false;
  }
  
  const providedSecret = req.headers.get('x-cron-secret');
  return providedSecret === cronSecret;
}

/**
 * Verify internal API calls (for brute-force-check record action)
 */
export function verifyInternalSecret(req: Request): boolean {
  const internalSecret = Deno.env.get('INTERNAL_API_SECRET');
  if (!internalSecret) {
    console.warn('[Auth] INTERNAL_API_SECRET not configured');
    return false;
  }
  
  const providedSecret = req.headers.get('x-internal-secret');
  return providedSecret === internalSecret;
}
