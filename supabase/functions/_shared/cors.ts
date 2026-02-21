/**
 * Configuration CORS centralisée et sécurisée
 * Restreint aux domaines connus de la plateforme
 */

// Domaines autorisés
const ALLOWED_ORIGINS = [
  'https://fan-forge-global.lovable.app',      // Production
  'https://id-preview--d6571390-5df4-4a85-b36b-d85a8872c669.lovable.app', // Preview
  'http://localhost:5173',                      // Dev local
  'http://localhost:3000',                      // Dev local alt
  'http://127.0.0.1:5173',                      // Dev local
];

/**
 * Génère les headers CORS en fonction de l'origine de la requête
 * Retourne l'origine si elle est autorisée, sinon refuse
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  
  // Vérifier si l'origine est autorisée
  const isAllowed = ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  );
  
  // Pour les previews Lovable dynamiques
  const isLovablePreview = origin.includes('.lovable.app') || origin.includes('.lovableproject.com');
  
  const allowedOrigin = (isAllowed || isLovablePreview) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-turnstile-token, x-internal-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, stripe-signature',
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

// REMOVED: Legacy wildcard corsHeaders export has been deleted
// All edge functions must use getCorsHeaders(req) instead
