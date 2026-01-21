import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

// Domaines autorisés pour les requêtes
const ALLOWED_ORIGINS = [
  'lovableproject.com',
  'lovable.app',
  'localhost',
  '127.0.0.1'
];

const logStep = (step: string, details?: any) => {
  console.log(`[GET-SIGNED-URL] ${step}`, details ? JSON.stringify(details) : '');
};

// Helper: Decode JWT payload without verification (Supabase already signed it)
function decodeJwtPayload(token: string): { sub: string; exp: number; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    // Base64url decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("[GET-SIGNED-URL] JWT decode error:", error);
    return null;
  }
}

/**
 * Vérifie si l'origine de la requête est autorisée
 */
const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return ALLOWED_ORIGINS.some(allowed => 
      url.hostname === allowed || url.hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
};

/**
 * Génère un identifiant de requête unique pour le tracking
 */
const generateRequestId = (): string => {
  return crypto.randomUUID().substring(0, 8);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || generateRequestId();
  const origin = req.headers.get('origin') || req.headers.get('referer');

  try {
    logStep('Starting signed URL generation', { requestId, origin });

    // Vérifier l'origine (non bloquant pour le moment, juste logging)
    if (!isOriginAllowed(origin)) {
      logStep('Warning: Request from unknown origin', { origin, requestId });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client avec service role pour accéder au storage
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Client pour vérifier l'utilisateur
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logStep('No auth header provided', { requestId });
      return new Response(
        JSON.stringify({ error: 'Authorization required', requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode JWT to get user ID
    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = decodeJwtPayload(token);
    
    if (!jwtPayload || !jwtPayload.sub) {
      logStep('Invalid JWT payload', { requestId });
      return new Response(
        JSON.stringify({ error: 'Invalid user', requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp && jwtPayload.exp < now) {
      logStep('Token expired', { requestId });
      return new Response(
        JSON.stringify({ error: 'Token expired', requestId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = jwtPayload.sub;
    logStep('User authenticated via JWT decode', { userId, requestId });

    const { filePath, bucket, contentId, includeChecksum } = await req.json();

    if (!filePath || !bucket) {
      return new Response(
        JSON.stringify({ error: 'filePath and bucket are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Request params', { filePath, bucket, contentId });

    // Si c'est un contenu premium, vérifier l'accès
    if (contentId) {
      // Récupérer les infos du contenu
      const { data: content, error: contentError } = await supabaseAdmin
        .from('content')
        .select('creator_id, is_premium, is_preview')
        .eq('id', contentId)
        .single();

      if (contentError || !content) {
        logStep('Content not found', contentError);
        return new Response(
          JSON.stringify({ error: 'Content not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Si le contenu est premium et n'est pas un preview, vérifier l'abonnement
      if (content.is_premium && !content.is_preview) {
        const { data: subscription } = await supabaseAdmin
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', userId)
          .eq('creator_id', content.creator_id)
          .eq('status', 'active')
          .maybeSingle();

        // Vérifier aussi si l'utilisateur est le créateur
        const { data: creator } = await supabaseAdmin
          .from('creators')
          .select('user_id')
          .eq('id', content.creator_id)
          .single();

        const isCreator = creator?.user_id === userId;
        const isAdmin = await checkIsAdmin(supabaseAdmin, userId);

        if (!subscription && !isCreator && !isAdmin) {
          logStep('Access denied - no subscription', { userId, creatorId: content.creator_id });
          return new Response(
            JSON.stringify({ error: 'Subscription required to access this content' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        logStep('Access granted', { isSubscribed: !!subscription, isCreator, isAdmin });
      }
    }

    // Générer l'URL signée avec expiration (1 heure)
    const expiresIn = 3600; // 1 heure en secondes
    
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (signedUrlError) {
      logStep('Failed to create signed URL', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Signed URL generated successfully', { expiresIn, requestId });

    // Générer un checksum si demandé pour la vérification d'intégrité
    let checksum: string | undefined;
    if (includeChecksum) {
      const data = `${filePath}:${userId}:${bucket}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
    }

    return new Response(
      JSON.stringify({ 
        signedUrl: signedUrlData.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        requestId,
        checksum,
        issuedAt: new Date().toISOString(),
        userId: userId.substring(0, 8) + '...' // Truncated for logging
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logStep('Error', { error: error.message, requestId });
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Vérifier si l'utilisateur est admin
 */
async function checkIsAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  
  return !!data;
}
