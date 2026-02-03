import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_COMMISSION_RATE = 0.15; // 15%

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PRIVATE-LIVE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Fonction démarrée");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Non authentifié");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Non authentifié");
    }
    logStep("Utilisateur authentifié", { userId: user.id });

    const body = await req.json();
    const { requestId } = body;

    if (!requestId) {
      throw new Error("ID de demande manquant");
    }

    // Récupérer la demande de live privé
    const { data: request, error: requestError } = await supabaseAdmin
      .from("private_live_requests")
      .select(`
        *,
        creators:creator_id (
          id,
          user_id,
          stage_name,
          stripe_account_id
        )
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      throw new Error("Demande de live privé introuvable");
    }

    // Vérifier que c'est bien le demandeur qui paie
    if (request.requester_id !== user.id) {
      throw new Error("Vous n'êtes pas autorisé à payer pour cette demande");
    }

    // Vérifier le statut
    if (request.status !== "accepted") {
      throw new Error("Cette demande n'est pas encore acceptée par le créateur");
    }

    if (!request.price || request.price <= 0) {
      throw new Error("Le prix n'a pas été défini par le créateur");
    }

    // Vérifier que le créateur a Stripe Connect
    if (!request.creators?.stripe_account_id) {
      throw new Error("Le créateur n'a pas encore configuré ses paiements");
    }

    logStep("Demande validée", { 
      requestId, 
      price: request.price,
      creatorAccountId: request.creators.stripe_account_id
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculer la commission plateforme (15%)
    const totalAmountCents = Math.round(request.price * 100);
    const platformFeeCents = Math.round(totalAmountCents * PLATFORM_COMMISSION_RATE);
    
    logStep("Calcul des montants", {
      totalAmount: request.price,
      platformFee: platformFeeCents / 100,
      creatorAmount: (totalAmountCents - platformFeeCents) / 100
    });

    // Chercher ou créer le client Stripe
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Créer la session Checkout avec transfert vers le compte créateur
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: request.currency?.toLowerCase() || "eur",
            product_data: {
              name: `Live privé avec ${request.creators.stage_name || 'Créateur'}`,
              description: `Session privée le ${new Date(request.proposed_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })} - Durée: ${request.proposed_duration || 30} minutes`,
            },
            unit_amount: totalAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: request.creators.stripe_account_id,
        },
        metadata: {
          private_live_request_id: requestId,
          creator_id: request.creator_id,
          requester_id: user.id,
          type: "private_live"
        }
      },
      success_url: `${req.headers.get("origin")}/live-calendar?payment=success&request=${requestId}`,
      cancel_url: `${req.headers.get("origin")}/live-calendar?payment=cancelled&request=${requestId}`,
      metadata: {
        private_live_request_id: requestId,
        creator_id: request.creator_id,
        requester_id: user.id,
        type: "private_live"
      }
    });

    // Mettre à jour la demande avec l'ID de session
    await supabaseAdmin
      .from("private_live_requests")
      .update({ 
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    logStep("Session Stripe créée", { sessionId: session.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: session.url,
        sessionId: session.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERREUR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
