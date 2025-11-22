import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Limites par endpoint (requêtes par minute)
const RATE_LIMITS: Record<string, number> = {
  'auth': 5,           // 5 tentatives de connexion par minute
  'upload': 10,        // 10 uploads par minute
  'message': 20,       // 20 messages par minute
  'search': 30,        // 30 recherches par minute
  'default': 60,       // 60 requêtes par minute par défaut
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { endpoint } = await req.json();
    if (!endpoint) throw new Error("Missing endpoint parameter");

    // Récupérer l'IP et le user_id
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userId = data.user?.id || null;
    }

    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Vérifier le nombre de requêtes dans la dernière minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    
    const { count, error: countError } = await supabaseClient
      .from('rate_limit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('endpoint', endpoint)
      .gte('created_at', oneMinuteAgo)
      .or(userId ? `user_id.eq.${userId},ip_address.eq.${ipAddress}` : `ip_address.eq.${ipAddress}`);

    if (countError) throw countError;

    const limit = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
    const isLimited = (count || 0) >= limit;

    if (!isLimited) {
      // Logger la requête
      await supabaseClient
        .from('rate_limit_logs')
        .insert({
          user_id: userId,
          ip_address: ipAddress,
          endpoint: endpoint,
        });
    }

    return new Response(JSON.stringify({ 
      allowed: !isLimited,
      limit: limit,
      current: count || 0,
      resetIn: 60 - Math.floor((Date.now() % 60000) / 1000),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isLimited ? 429 : 200,
    });
  } catch (error) {
    // Serialize full error for logging and response, but never block the user
    const errorDetails =
      typeof error === 'object' && error !== null
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : String(error);

    console.error('Rate limit check error:', errorDetails);

    // Fail open: allow the request even if rate-limit check fails
    return new Response(
      JSON.stringify({
        allowed: true,
        error: errorDetails || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});