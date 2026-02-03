import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PLATFORM_COMMISSION_RATE = 0.15;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PRIVATE-LIVE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook reçu");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY non configurée");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event: Stripe.Event;

    // SÉCURITÉ: Toujours vérifier la signature en production
    if (!webhookSecret) {
      logStep("ERREUR SÉCURITÉ: STRIPE_WEBHOOK_SECRET non configuré");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!signature) {
      logStep("ERREUR SÉCURITÉ: Signature Stripe manquante");
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Vérification cryptographique de la signature Stripe
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    logStep("Event type", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Vérifier que c'est un paiement de live privé
      if (session.metadata?.type !== "private_live") {
        logStep("Pas un paiement de live privé, ignoré");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const requestId = session.metadata.private_live_request_id;
      const creatorId = session.metadata.creator_id;
      const requesterId = session.metadata.requester_id;

      logStep("Paiement live privé confirmé", { requestId, creatorId });

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Récupérer la demande
      const { data: request } = await supabaseAdmin
        .from("private_live_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (!request) {
        throw new Error("Demande introuvable");
      }

      const grossAmount = request.price;
      const platformCommission = grossAmount * PLATFORM_COMMISSION_RATE;
      const creatorAmount = grossAmount - platformCommission;

      // Mettre à jour le statut de la demande
      await supabaseAdmin
        .from("private_live_requests")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);

      // Enregistrer le revenu
      await supabaseAdmin
        .from("private_live_revenue")
        .insert({
          private_live_request_id: requestId,
          creator_id: creatorId,
          requester_id: requesterId,
          gross_amount: grossAmount,
          platform_commission: platformCommission,
          creator_amount: creatorAmount,
          currency: request.currency || "EUR",
          stripe_payment_intent_id: session.payment_intent as string
        });

      // Envoyer un message automatique au demandeur
      const { data: creator } = await supabaseAdmin
        .from("creators")
        .select("stage_name")
        .eq("id", creatorId)
        .single();

      await supabaseAdmin
        .from("private_messages")
        .insert({
          creator_id: creatorId,
          subscriber_id: requesterId,
          sender_type: "creator",
          message_type: "text",
          content: `🎬 Votre live privé est confirmé ! Rendez-vous le ${new Date(request.proposed_date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric', 
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
          })}. Je vous enverrai le lien pour rejoindre le live juste avant le début.`
        });

      // Créer une notification pour le créateur
      const { data: creatorData } = await supabaseAdmin
        .from("creators")
        .select("user_id")
        .eq("id", creatorId)
        .single();

      if (creatorData?.user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", requesterId)
          .single();

        await supabaseAdmin
          .from("notifications")
          .insert({
            user_id: creatorData.user_id,
            type: "payment_success",
            title: "Live privé payé ! 🎉",
            message: `${profile?.display_name || profile?.username || 'Un utilisateur'} a payé ${grossAmount}€ pour un live privé`,
            data: {
              request_id: requestId,
              amount: grossAmount,
              requester_id: requesterId
            }
          });
      }

      logStep("Paiement traité avec succès", {
        requestId,
        grossAmount,
        platformCommission,
        creatorAmount
      });
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERREUR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
