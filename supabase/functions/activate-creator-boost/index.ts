import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

  // Create Supabase client using the service role key for database updates
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Parse request body
    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("Session ID manquant");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw new Error("Paiement non confirmé");
    }

    const metadata = session.metadata;
    if (!metadata || !metadata.creator_id || !metadata.duration_hours) {
      throw new Error("Métadonnées de session invalides");
    }

    const creatorId = metadata.creator_id;
    const durationHours = parseFloat(metadata.duration_hours);

    // Calculate boost end time
    const now = new Date();
    const boostEndTime = new Date(now.getTime() + (durationHours * 60 * 60 * 1000));

    // Update creator to be featured until the boost end time
    const { error: updateError } = await supabaseClient
      .from("creators")
      .update({
        is_featured: true,
        featured_until: boostEndTime.toISOString()
      })
      .eq("id", creatorId);

    if (updateError) {
      console.error("Error updating creator boost:", updateError);
      throw new Error("Erreur lors de l'activation du boost");
    }

    console.log(`Boost activated for creator ${creatorId} until ${boostEndTime.toISOString()}`);

    return new Response(JSON.stringify({ 
      success: true,
      boost_active_until: boostEndTime.toISOString(),
      message: "Boost activé avec succès!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error activating creator boost:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});