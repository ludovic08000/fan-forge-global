/**
 * Configuration CORS centralisée et sécurisée
 * Comparaison EXACTE des origines - pas de wildcard
 */

// Domaines autorisés (liste exhaustive)
const ALLOWED_ORIGINS = new Set([
  'https://fan-forge-global.lovable.app',
  'https://id-preview--d6571390-5df4-4a85-b36b-d85a8872c669.lovable.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
]);

/**
 * Génère les headers CORS en fonction de l'origine de la requête
 * Comparaison EXACTE uniquement - pas de substring/wildcard
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  
  // Comparaison exacte uniquement
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : '';
  
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
