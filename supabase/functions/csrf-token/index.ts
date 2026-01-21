import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Expose-Headers": "x-csrf-token",
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
    console.error("[CSRF] JWT decode error:", error);
    return null;
  }
}

// Clé secrète pour signer les tokens (utilise SUPABASE_SERVICE_ROLE_KEY comme seed)
const getSecretKey = () => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return serviceKey.substring(0, 32);
};

// Génère un token CSRF sécurisé
const generateToken = async (userId: string, sessionId: string): Promise<string> => {
  const timestamp = Date.now();
  const data = `${userId}:${sessionId}:${timestamp}`;
  
  // Encoder et créer une signature
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
  
  // Token format: base64(data):signature
  const tokenData = btoa(data);
  return `${tokenData}.${signatureHex}`;
};

// Vérifie un token CSRF
const verifyToken = async (token: string, userId: string): Promise<{ valid: boolean; reason?: string }> => {
  try {
    const [tokenData, signature] = token.split('.');
    if (!tokenData || !signature) {
      return { valid: false, reason: "Invalid token format" };
    }
    
    const data = atob(tokenData);
    const [tokenUserId, sessionId, timestampStr] = data.split(':');
    
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
    console.error("Token verification error:", error);
    return { valid: false, reason: "Verification error" };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentifier l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode JWT to get user ID
    const token = authHeader.replace("Bearer ", "");
    const jwtPayload = decodeJwtPayload(token);
    
    if (!jwtPayload || !jwtPayload.sub) {
      console.error("[CSRF] Invalid JWT payload");
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (jwtPayload.exp && jwtPayload.exp < now) {
      console.error("[CSRF] Token expired");
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = jwtPayload.sub;
    console.log("[CSRF] User authenticated via JWT decode:", userId);

    const { action, csrfToken } = await req.json();

    if (action === "generate") {
      // Générer un nouveau token CSRF
      const sessionId = crypto.randomUUID();
      const newToken = await generateToken(userId, sessionId);
      
      console.log(`[CSRF] Token generated for user ${userId}`);
      
      return new Response(JSON.stringify({ 
        token: newToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }), {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "x-csrf-token": newToken
        },
      });
    } 
    
    if (action === "verify") {
      if (!csrfToken) {
        return new Response(JSON.stringify({ valid: false, reason: "No token provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const result = await verifyToken(csrfToken, userId);
      
      console.log(`[CSRF] Token verification for user ${userId}: ${result.valid}`);
      
      return new Response(JSON.stringify(result), {
        status: result.valid ? 200 : 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[CSRF] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
