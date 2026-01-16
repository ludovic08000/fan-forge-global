/**
 * Shared CSRF token verification utilities
 */

// Clé secrète pour vérifier les tokens (utilise SUPABASE_SERVICE_ROLE_KEY comme seed)
const getSecretKey = (): string => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return serviceKey.substring(0, 32);
};

/**
 * Vérifie un token CSRF
 * @param token - Le token CSRF à vérifier
 * @param userId - L'ID de l'utilisateur attendu
 * @returns Un objet avec valid: boolean et reason?: string
 */
export const verifyCsrfToken = async (
  token: string, 
  userId: string
): Promise<{ valid: boolean; reason?: string }> => {
  try {
    if (!token) {
      return { valid: false, reason: "No CSRF token provided" };
    }

    const [tokenData, signature] = token.split('.');
    if (!tokenData || !signature) {
      return { valid: false, reason: "Invalid token format" };
    }
    
    const data = atob(tokenData);
    const [tokenUserId, _sessionId, timestampStr] = data.split(':');
    
    // Vérifier que le user_id correspond
    if (tokenUserId !== userId) {
      return { valid: false, reason: "User mismatch" };
    }
    
    // Vérifier l'expiration (1 heure)
    const timestamp = parseInt(timestampStr);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - timestamp > oneHour) {
      return { valid: false, reason: "Token expired" };
    }
    
    // Vérifier la signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(getSecretKey()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(data)
    );
    
    return { valid: isValid, reason: isValid ? undefined : "Invalid signature" };
  } catch (error) {
    console.error("[CSRF] Token verification error:", error);
    return { valid: false, reason: "Verification error" };
  }
};

/**
 * Middleware pour vérifier le token CSRF depuis les headers ou le body
 * @param req - La requête HTTP
 * @param userId - L'ID de l'utilisateur authentifié
 * @returns Un objet avec valid: boolean et reason?: string
 */
export const validateCsrfFromRequest = async (
  req: Request,
  userId: string,
  body?: { csrfToken?: string }
): Promise<{ valid: boolean; reason?: string }> => {
  // Chercher le token dans les headers ou le body
  const csrfToken = req.headers.get("x-csrf-token") || body?.csrfToken;
  
  if (!csrfToken) {
    return { valid: false, reason: "CSRF token required" };
  }
  
  return verifyCsrfToken(csrfToken, userId);
};

/**
 * Crée une réponse d'erreur CSRF standardisée
 */
export const csrfErrorResponse = (reason: string, corsHeaders: Record<string, string>): Response => {
  return new Response(
    JSON.stringify({ error: "CSRF validation failed", reason }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
};
