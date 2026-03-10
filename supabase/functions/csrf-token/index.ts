// v2 - CORS redeploy for theforge.fans
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { validateJwtAndGetUserId } from "../_shared/auth.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// Secret key for signing tokens
const getSecretKey = () => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return serviceKey.substring(0, 32);
};

// Generate secure CSRF token
const generateToken = async (userId: string, sessionId: string): Promise<string> => {
  const timestamp = Date.now();
  const data = `${userId}:${sessionId}:${timestamp}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecretKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data)
  );
  
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const tokenData = btoa(data);
  return `${tokenData}.${signatureHex}`;
};

// Verify CSRF token
const verifyToken = async (token: string, userId: string): Promise<{ valid: boolean; reason?: string }> => {
  try {
    const [tokenData, signature] = token.split('.');
    if (!tokenData || !signature) {
      return { valid: false, reason: "Invalid token format" };
    }
    
    const data = atob(tokenData);
    const [tokenUserId, sessionId, timestampStr] = data.split(':');
    
    if (tokenUserId !== userId) {
      return { valid: false, reason: "User mismatch" };
    }
    
    // Check expiration (1 hour)
    const timestamp = parseInt(timestampStr);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - timestamp > oneHour) {
      return { valid: false, reason: "Token expired" };
    }
    
    // Verify signature
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
    console.error("Token verification error:", error);
    return { valid: false, reason: "Verification error" };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);
  // Add extra headers for CSRF
  const responseHeaders = {
    ...corsHeaders,
    "Access-Control-Expose-Headers": "x-csrf-token",
  };

  try {
    // SECURITY: Proper JWT validation with signature verification
    const authResult = await validateJwtAndGetUserId(req.headers.get("Authorization"));
    
    if (authResult.error) {
      console.error("[CSRF] Auth failed:", authResult.error);
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authResult.userId!;
    console.log("[CSRF] User authenticated:", userId);

    const { action, csrfToken } = await req.json();

    if (action === "generate") {
      const sessionId = crypto.randomUUID();
      const newToken = await generateToken(userId, sessionId);
      
      console.log(`[CSRF] Token generated for user ${userId}`);
      
      return new Response(JSON.stringify({ 
        token: newToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }), {
        headers: { 
          ...responseHeaders, 
          "Content-Type": "application/json",
          "x-csrf-token": newToken
        },
      });
    } 
    
    if (action === "verify") {
      if (!csrfToken) {
        return new Response(JSON.stringify({ valid: false, reason: "No token provided" }), {
          status: 400,
          headers: { ...responseHeaders, "Content-Type": "application/json" },
        });
      }
      
      const result = await verifyToken(csrfToken, userId);
      
      console.log(`[CSRF] Token verification for user ${userId}: ${result.valid}`);
      
      return new Response(JSON.stringify(result), {
        status: result.valid ? 200 : 403,
        headers: { ...responseHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...responseHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[CSRF] Error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
