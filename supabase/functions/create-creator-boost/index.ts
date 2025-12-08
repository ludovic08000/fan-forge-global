import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Available boost options with price IDs
const BOOST_OPTIONS: Record<string, { price_id: string; duration_hours: number; name: string }> = {
  "30min": {
    price_id: "price_1S9QlTG4R6fTor2d573eKcGj",
    duration_hours: 0.5,
    name: "30 minutes"
  },
  "24h": {
    price_id: "price_1S9QljG4R6fTor2dCsOCT4oT", 
    duration_hours: 24,
    name: "24 heures"
  },
  "1week": {
    price_id: "price_1S9QlyG4R6fTor2dhQYg3mZF",
    duration_hours: 168, // 7 days * 24 hours
    name: "1 semaine"
  }
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREATOR-BOOST] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using the anon key for user authentication
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");
    
    // Parse request body
    const { boost_type } = await req.json();
    logStep("Request parsed", { boost_type });
    
    if (!boost_type || !BOOST_OPTIONS[boost_type]) {
      throw new Error("Type de boost invalide");
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Utilisateur non authentifié");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is a creator
    const { data: creator, error: creatorError } = await supabaseClient
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (creatorError || !creator) {
      throw new Error("Vous devez être un créateur pour acheter un boost");
    }
    logStep("Creator verified", { creatorId: creator.id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      // Create new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          creator_id: creator.id
        }
      });
      customerId = newCustomer.id;
      logStep("New customer created", { customerId });
    }

    const boostOption = BOOST_OPTIONS[boost_type];

    // Create an embedded checkout session for the boost
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      ui_mode: "embedded",
      line_items: [
        {
          price: boostOption.price_id,
          quantity: 1,
        },
      ],
      mode: "payment",
      return_url: `${req.headers.get("origin")}/dashboard?boost_success=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        boost_type,
        creator_id: creator.id,
        user_id: user.id,
        duration_hours: boostOption.duration_hours.toString()
      }
    });

    logStep("Embedded checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      clientSecret: session.client_secret,
      boost_info: {
        type: boost_type,
        name: boostOption.name,
        duration_hours: boostOption.duration_hours
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
