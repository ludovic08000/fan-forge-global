import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCollaborativeContentInfo } from "../_shared/collaborativeRevenue.ts";
// CORS restreint aux domaines autorisés
const ALLOWED_ORIGINS = [
  "https://lovable.dev",
  "https://usjxcgauyvdocngfkhys.supabase.co",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => origin.includes(allowed.replace("https://", "")))
    ? origin
    : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PRIVATE-CONTENT-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Seules les requêtes POST sont acceptées (+ OPTIONS pour preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    logStep("Webhook received");

    // Vérifier les secrets requis
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Vérification OBLIGATOIRE de la signature Stripe
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Traiter uniquement les événements pertinents
    if (event.type !== "checkout.session.completed") {
      logStep("Event type not handled", { eventType: event.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    
    // Vérifier le type de contenu
    if (session.metadata?.content_type !== "private_content") {
      logStep("Not a private content payment", { contentType: session.metadata?.content_type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const messageId = session.metadata.message_id;
    const userId = session.metadata.user_id;

    if (!messageId || !userId) {
      logStep("ERROR: Missing metadata", { messageId, userId });
      return new Response(JSON.stringify({ error: "Missing metadata" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Processing private content payment", { messageId, userId });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer le message pour connaître son type et le créateur
    const { data: messageData } = await supabaseAdmin
      .from('private_messages')
      .select('message_type, price, creator_id')
      .eq('id', messageId)
      .single();

    const isMediaRequest = messageData?.message_type === 'image_request' || messageData?.message_type === 'video_request';

    // Marquer le message comme payé et mettre à jour le statut pour les media requests
    const updateData: Record<string, unknown> = { 
      is_paid: true,
      stripe_payment_intent_id: session.payment_intent as string
    };
    
    // Pour les media requests, mettre le statut à 'paid'
    if (isMediaRequest) {
      updateData.status = 'paid';
    }

    const { error: updateError } = await supabaseAdmin
      .from('private_messages')
      .update(updateData)
      .eq('id', messageId);

    if (updateError) {
      logStep("Error updating message", { error: updateError.message });
      throw new Error(`Failed to update message: ${updateError.message}`);
    }

    // Mettre à jour le statut du paiement
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('private_content_payments')
      .update({ status: 'paid' })
      .eq('message_id', messageId)
      .eq('subscriber_id', userId);

    if (paymentUpdateError) {
      logStep("Warning: Error updating payment record", { error: paymentUpdateError.message });
    }

    // Enregistrer la commission de la plateforme
    if (messageData?.price && messageData?.creator_id) {
      const { data: creator } = await supabaseAdmin
        .from('creators')
        .select('platform_commission_rate')
        .eq('id', messageData.creator_id)
        .single();

      const revenue = messageData.price;
      const commissionRate = creator?.platform_commission_rate || 0.15;
      const commissionAmount = revenue * commissionRate;
      const creatorPayout = revenue - commissionAmount;

      const now = new Date().toISOString();

      const { error: commissionError } = await supabaseAdmin
        .from('platform_commissions')
        .insert({
          creator_id: messageData.creator_id,
          total_revenue: revenue,
          subscription_revenue: 0,
          tips_revenue: 0,
          live_revenue: 0,
          private_content_revenue: revenue,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          creator_payout: creatorPayout,
          currency: 'EUR',
          period_start: now,
          period_end: now
        });

      if (commissionError) {
        logStep("Error recording commission", { error: commissionError.message });
      } else {
        logStep("Commission recorded", { revenue, commission: commissionAmount });
      }

      // Vérifier si c'est un contenu collaboratif et traiter le partage des revenus
      const contentId = session.metadata?.content_id;
      const isCollaborative = session.metadata?.is_collaborative === 'true';
      
      if (contentId && isCollaborative) {
        const collabInfo = await getCollaborativeContentInfo(supabaseAdmin, contentId);
        
        if (collabInfo.isCollaborative && collabInfo.partnership) {
          logStep("Processing collaborative revenue share", { contentId, creatorPayout });
          
          // Pour le contenu collaboratif, on doit transférer aux DEUX créateurs
          // Le paiement n'a pas utilisé transfer_data, donc tout est sur le compte plateforme
          const partnership = collabInfo.partnership;
          const isPrimaryRequester = messageData.creator_id === partnership.requester_id;
          const primaryShare = isPrimaryRequester 
            ? partnership.revenue_share_requester 
            : partnership.revenue_share_partner;
          const partnerShare = isPrimaryRequester 
            ? partnership.revenue_share_partner 
            : partnership.revenue_share_requester;
          const partnerId = isPrimaryRequester 
            ? partnership.partner_id 
            : partnership.requester_id;
          
          const primaryAmount = (creatorPayout * primaryShare) / 100;
          const partnerAmount = (creatorPayout * partnerShare) / 100;
          
          logStep("Revenue split calculated", { primaryAmount, partnerAmount, primaryShare, partnerShare });
          
          // Récupérer les comptes Stripe des deux créateurs
          const { data: creators } = await supabaseAdmin
            .from('creators')
            .select('id, stripe_account_id, user_id')
            .in('id', [messageData.creator_id, partnerId]);
          
          const primaryCreator = creators?.find(c => c.id === messageData.creator_id);
          const partnerCreator = creators?.find(c => c.id === partnerId);
          
          // Transférer au créateur principal
          if (primaryCreator?.stripe_account_id && primaryAmount >= 0.50) {
            try {
              const primaryTransfer = await stripe.transfers.create({
                amount: Math.round(primaryAmount * 100),
                currency: 'eur',
                destination: primaryCreator.stripe_account_id,
                transfer_group: session.payment_intent as string,
                metadata: {
                  type: 'collaborative_primary',
                  content_id: contentId,
                  partnership_id: partnership.id,
                }
              });
              logStep("Primary creator transfer done", { transferId: primaryTransfer.id, amount: primaryAmount });
            } catch (err) {
              logStep("Error transferring to primary creator", { error: String(err) });
            }
          }
          
          // Transférer au partenaire
          if (partnerCreator?.stripe_account_id && partnerAmount >= 0.50) {
            try {
              const partnerTransfer = await stripe.transfers.create({
                amount: Math.round(partnerAmount * 100),
                currency: 'eur',
                destination: partnerCreator.stripe_account_id,
                transfer_group: session.payment_intent as string,
                metadata: {
                  type: 'collaborative_partner',
                  content_id: contentId,
                  partnership_id: partnership.id,
                }
              });
              logStep("Partner creator transfer done", { transferId: partnerTransfer.id, amount: partnerAmount });
              
              // Notifier le partenaire
              await supabaseAdmin.from('notifications').insert({
                user_id: partnerCreator.user_id,
                type: 'collaborative_revenue',
                title: 'Revenu collaboratif reçu !',
                message: `Vous avez reçu ${partnerAmount.toFixed(2)}€ pour un contenu collaboratif.`,
                data: { content_id: contentId, amount: partnerAmount }
              });
            } catch (err) {
              logStep("Error transferring to partner", { error: String(err) });
            }
          }
          
          // Enregistrer la transaction
          await supabaseAdmin.from('collaborative_revenue_transactions').insert({
            content_id: contentId,
            partnership_id: partnership.id,
            primary_creator_id: messageData.creator_id,
            partner_creator_id: partnerId,
            total_amount: creatorPayout,
            primary_amount: primaryAmount,
            partner_amount: partnerAmount,
            currency: 'EUR',
            revenue_type: 'private_content',
            status: 'completed'
          });
          
          logStep("Collaborative revenue transaction recorded");
        }
      }
    }

    logStep("Private content payment processed successfully");

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...getCorsHeaders(null), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
