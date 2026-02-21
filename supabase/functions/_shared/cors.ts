/**
 * Configuration CORS centralisée et sécurisée
 * Comparaison exacte + pattern strict pour previews Lovable
 */

// Domaines autorisés (liste exacte)
const EXACT_ORIGINS = new Set([
  'https://fan-forge-global.lovable.app',
  'https://id-preview--d6571390-5df4-4a85-b36b-d85a8872c669.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]);

// Pattern strict pour previews Lovable dynamiques
// Format: https://{id-preview--uuid}.lovable.app ou https://{id-preview--uuid}.lovableproject.com
const LOVABLE_PREVIEW_REGEX = /^https:\/\/id-preview--[0-9a-f-]+\.(lovable\.app|lovableproject\.com)$/;

/**
 * Vérifie si une origine est autorisée
 */
function isOriginAllowed(origin: string): boolean {
  if (EXACT_ORIGINS.has(origin)) return true;
  if (LOVABLE_PREVIEW_REGEX.test(origin)) return true;
  return false;
}

/**
 * Génère les headers CORS en fonction de l'origine de la requête
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = isOriginAllowed(origin) ? origin : '';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-turnstile-token, x-internal-secret, x-cron-secret, x-csrf-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Handler pour les requêtes OPTIONS (preflight)
 */
export function handleCorsOptions(request: Request): Response {
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(request) 
  });
}

// Alias pour compatibilité
export const handleCorsPreflightRequest = handleCorsOptions;
