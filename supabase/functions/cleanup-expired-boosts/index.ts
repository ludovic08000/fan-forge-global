import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using the service role key
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const now = new Date().toISOString();
    
    // Find creators with expired boosts
    const { data: expiredCreators, error: selectError } = await supabaseClient
      .from("creators")
      .select("id, stage_name, featured_until")
      .eq("is_featured", true)
      .lt("featured_until", now);

    if (selectError) {
      throw new Error(`Error selecting expired creators: ${selectError.message}`);
    }

    if (!expiredCreators || expiredCreators.length === 0) {
      console.log("No expired boosts found");
      return new Response(JSON.stringify({ 
        message: "Aucun boost expiré trouvé",
        cleaned_count: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${expiredCreators.length} expired boosts to clean up`);

    // Update expired creators to remove featured status
    const { error: updateError } = await supabaseClient
      .from("creators")
      .update({
        is_featured: false,
        featured_until: null
      })
      .eq("is_featured", true)
      .lt("featured_until", now);

    if (updateError) {
      throw new Error(`Error updating expired creators: ${updateError.message}`);
    }

    console.log(`Successfully cleaned up ${expiredCreators.length} expired boosts`);

    return new Response(JSON.stringify({ 
      message: `${expiredCreators.length} boost(s) expiré(s) nettoyé(s)`,
      cleaned_count: expiredCreators.length,
      cleaned_creators: expiredCreators.map(c => ({
        id: c.id,
        name: c.stage_name,
        expired_at: c.featured_until
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error cleaning up expired boosts:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});