import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }
  
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Verify JWT token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create client with user's token to verify authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Get user's creator profile
    const { data: creator, error: creatorError } = await supabaseUser
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creator) {
      console.error("User is not a creator:", creatorError?.message);
      return new Response(
        JSON.stringify({ error: "Accès refusé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Use service role for cleanup operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Delete only THIS creator's expired referral codes
    const { data: deletedCodes, error } = await supabaseAdmin
      .from("referral_codes")
      .delete()
      .eq("creator_id", creator.id)
      .lt("expires_at", new Date().toISOString())
      .not("expires_at", "is", null)
      .select("id, code");

    if (error) {
      console.error("Error deleting expired codes:", error);
      throw error;
    }

    console.log(`Creator ${creator.id} cleanup: deleted ${deletedCodes?.length || 0} expired codes`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCodes?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
