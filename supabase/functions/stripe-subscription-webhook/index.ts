import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// CORS restreint - Stripe n'envoie pas d'origin donc on accepte tout pour les webhooks
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Seules les requêtes POST sont acceptées
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // Vérifier toutes les variables d'environnement requises
    if (!stripeKey || !supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing required environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // SECURITE: La signature Stripe est OBLIGATOIRE en production
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const body = await req.text();

    let event: Stripe.Event;

    // Vérification OBLIGATOIRE de la signature Stripe
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type, eventId: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Event type", { type: event.type });

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });

    // Gérer le checkout complété - CRÉATION de l'abonnement
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      logStep("Checkout session completed", { 
        sessionId: session.id,
        subscriptionId: session.subscription,
        customerId: session.customer,
        customerEmail: session.customer_email || session.customer_details?.email
      });

      if (session.mode === 'subscription' && session.subscription) {
        const stripeSubscriptionId = session.subscription as string;
        const customerEmail = session.customer_email || session.customer_details?.email;
        
        // Récupérer les détails de l'abonnement Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        logStep("Retrieved Stripe subscription", {
          status: stripeSubscription.status,
          currentPeriodEnd: stripeSubscription.current_period_end
        });

        // Trouver l'utilisateur par email
        const { data: userData } = await supabaseClient.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === customerEmail);
        
        if (!user) {
          logStep("User not found for email", { email: customerEmail });
          return new Response(JSON.stringify({ error: "User not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        logStep("Found user", { userId: user.id });

        // Récupérer le creator_id depuis les metadata de la session
        const creatorId = session.metadata?.creator_id;
        
        if (!creatorId) {
          logStep("Creator ID not found in session metadata");
          return new Response(JSON.stringify({ error: "Creator ID not found" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Récupérer le prix de l'abonnement
        const priceAmount = stripeSubscription.items.data[0]?.price?.unit_amount || 0;
        const currency = stripeSubscription.items.data[0]?.price?.currency || 'eur';

        // Vérifier si un abonnement existe déjà pour ce subscriber/creator
        const { data: existingSub } = await supabaseClient
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', user.id)
          .eq('creator_id', creatorId)
          .single();

        if (existingSub) {
          // Mettre à jour l'abonnement existant
          const { error: updateError } = await supabaseClient
            .from('subscriptions')
            .update({
              status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              price: priceAmount / 100,
              currency: currency.toUpperCase(),
              start_date: new Date().toISOString(),
              end_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.id);

          if (updateError) {
            logStep("Error updating existing subscription", { error: updateError.message });
          } else {
            logStep("Existing subscription updated", { subscriptionId: existingSub.id });
          }
        } else {
          // Créer un nouvel abonnement
          const { data: newSub, error: insertError } = await supabaseClient
            .from('subscriptions')
            .insert({
              subscriber_id: user.id,
              creator_id: creatorId,
              stripe_subscription_id: stripeSubscriptionId,
              status: 'active',
              price: priceAmount / 100,
              currency: currency.toUpperCase(),
              start_date: new Date().toISOString(),
              end_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              auto_renew: true
            })
            .select()
            .single();

          if (insertError) {
            logStep("Error creating subscription", { error: insertError.message });
          } else {
            logStep("New subscription created", { subscriptionId: newSub?.id });

            // Mettre à jour le compteur d'abonnés du créateur
            await supabaseClient.rpc('increment_creator_subscribers', { creator_uuid: creatorId });

            // Envoyer le message de bienvenue automatique
            if (newSub?.id) {
              try {
                const welcomeResponse = await fetch(`${supabaseUrl}/functions/v1/send-auto-message`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    subscriptionId: newSub.id,
                    messageType: "welcome",
                    creatorId: creatorId,
                    subscriberId: user.id,
                  }),
                });
                const welcomeResult = await welcomeResponse.json();
                logStep("Welcome message result", welcomeResult);
              } catch (welcomeErr) {
                logStep("Error sending welcome message", { error: String(welcomeErr) });
              }
            }
          }
        }

        // Gérer les commissions d'affiliation si présentes
        const affiliateCodeId = session.metadata?.affiliate_code_id;
        const affiliateCreatorId = session.metadata?.affiliate_creator_id;
        const affiliateCommissionRate = session.metadata?.affiliate_commission_rate 
          ? parseFloat(session.metadata.affiliate_commission_rate) 
          : null;

        if (affiliateCodeId && affiliateCreatorId && affiliateCommissionRate) {
          const subscriptionPrice = priceAmount / 100;
          // Commission = prix * taux de commission / 100
          const commissionAmount = (subscriptionPrice * affiliateCommissionRate) / 100;
          
          logStep("Processing affiliate commission", {
            affiliateCodeId,
            affiliateCreatorId,
            subscriptionPrice,
            commissionRate: affiliateCommissionRate,
            commissionAmount
          });

          // Créer l'entrée dans referral_subscriptions
          const { error: refSubError } = await supabaseClient
            .from('referral_subscriptions')
            .insert({
              referral_code_id: affiliateCodeId,
              referrer_creator_id: affiliateCreatorId,
              referred_user_id: user.id,
              subscribed_to_creator_id: creatorId,
              subscription_id: existingSub?.id || newSub?.id || null,
              commission_paid: commissionAmount
            });

          if (refSubError) {
            logStep("Error creating referral subscription", { error: refSubError.message });
          } else {
            logStep("Referral subscription created");

            // Mettre à jour les statistiques du code d'affiliation
            const { data: currentCode } = await supabaseClient
              .from('creator_referral_codes')
              .select('uses_count, total_earnings')
              .eq('id', affiliateCodeId)
              .single();

            if (currentCode) {
              await supabaseClient
                .from('creator_referral_codes')
                .update({
                  uses_count: (currentCode.uses_count || 0) + 1,
                  total_earnings: (Number(currentCode.total_earnings) || 0) + commissionAmount
                })
                .eq('id', affiliateCodeId);
              
              logStep("Affiliate code stats updated", {
                newUsesCount: (currentCode.uses_count || 0) + 1,
                newTotalEarnings: (Number(currentCode.total_earnings) || 0) + commissionAmount
              });
            }

            // Notifier le créateur affilié
            const { data: affiliateCreator } = await supabaseClient
              .from('creators')
              .select('user_id')
              .eq('id', affiliateCreatorId)
              .single();

            if (affiliateCreator?.user_id) {
              await supabaseClient
                .from('notifications')
                .insert({
                  user_id: affiliateCreator.user_id,
                  type: 'affiliate_commission',
                  title: 'Commission d\'affiliation !',
                  message: `Vous avez gagné ${commissionAmount.toFixed(2)}€ grâce à votre code d'affiliation !`,
                  data: {
                    commission_amount: commissionAmount,
                    subscribed_to_creator_id: creatorId
                  }
                });
              logStep("Affiliate notification sent");
            }
          }
        }

        // Créer une notification pour le créateur
        const { data: creator } = await supabaseClient
          .from('creators')
          .select('user_id')
          .eq('id', creatorId)
          .single();

        if (creator) {
          const { data: subscriberProfile } = await supabaseClient
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', user.id)
            .single();

          const subscriberName = subscriberProfile?.display_name || subscriberProfile?.username || 'Un utilisateur';

          await supabaseClient
            .from('notifications')
            .insert({
              user_id: creator.user_id,
              type: 'new_subscription',
              title: 'Nouvel abonnement',
              message: `${subscriberName} s'est abonné(e) à votre profil !`,
              data: {
                subscriber_id: user.id,
                creator_id: creatorId
              }
            });

          logStep("New subscription notification sent to creator");
        }
      }

      // Gérer les tips (live_tip ET creator_tip)
      if (session.mode === 'payment' && (session.metadata?.type === 'live_tip' || session.metadata?.type === 'creator_tip')) {
        const creatorId = session.metadata.creator_id;
        const senderId = session.metadata.sender_id;
        const liveStreamId = session.metadata.live_stream_id;
        const tipMessage = session.metadata.message || '';
        const amount = session.amount_total ? session.amount_total / 100 : 0;
        const paymentIntentId = session.payment_intent as string;

        logStep("Processing tip payment", { type: session.metadata.type, creatorId, senderId, amount, paymentIntentId });

        if (creatorId && senderId && amount > 0) {
          // Mettre à jour le tip existant OU en créer un nouveau
          const { data: existingTip } = await supabaseClient
            .from('tips')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .maybeSingle();

          if (existingTip) {
            // Tip déjà enregistré, juste confirmer qu'il est payé (rien à faire, il est déjà là)
            logStep("Tip already exists in database", { tipId: existingTip.id });
          } else {
            // Créer le tip s'il n'existe pas (fallback)
            const { data: newTip, error: tipInsertError } = await supabaseClient
              .from('tips')
              .insert({
                creator_id: creatorId,
                sender_id: senderId,
                amount: amount,
                currency: 'EUR',
                message: tipMessage || null,
                stripe_payment_intent_id: paymentIntentId,
              })
              .select()
              .single();

            if (tipInsertError) {
              logStep("Error inserting tip", { error: tipInsertError.message });
            } else {
              logStep("Tip inserted via webhook", { tipId: newTip?.id });
            }
          }

          // Récupérer le taux de commission du créateur
          const { data: creator } = await supabaseClient
            .from('creators')
            .select('user_id, platform_commission_rate')
            .eq('id', creatorId)
            .single();

          // Note: Commission sur tips = 0 (pas de commission sur les pourboires selon la RPC)
          // Mais on log quand même pour le tracking

          // Notification au créateur
          if (creator?.user_id) {
            const { data: senderProfile } = await supabaseClient
              .from('profiles')
              .select('display_name, username')
              .eq('user_id', senderId)
              .single();

            const senderName = senderProfile?.display_name || senderProfile?.username || 'Quelqu\'un';

            await supabaseClient
              .from('notifications')
              .insert({
                user_id: creator.user_id,
                type: 'tip_received',
                title: 'Pourboire reçu !',
                message: tipMessage 
                  ? `${senderName} vous a envoyé ${amount.toFixed(2)}€ : "${tipMessage}"`
                  : `${senderName} vous a envoyé ${amount.toFixed(2)}€`,
                data: {
                  sender_id: senderId,
                  amount,
                  live_stream_id: liveStreamId || null
                }
              });

            logStep("Tip notification sent to creator");
          }
        }
      }
    }

    // Gérer la création d'abonnement via customer.subscription.created
    if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = subscription.id;
      const customerId = subscription.customer as string;
      const creatorId = subscription.metadata?.creator_id;
      const userId = subscription.metadata?.user_id;

      logStep("Subscription created event", { 
        subscriptionId: stripeSubscriptionId,
        customerId,
        creatorId,
        userId,
        status: subscription.status
      });

      if (creatorId && userId) {
        const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0;
        const currency = subscription.items.data[0]?.price?.currency || 'eur';

        // Vérifier si un abonnement existe déjà
        const { data: existingSub } = await supabaseClient
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', userId)
          .eq('creator_id', creatorId)
          .single();

        if (existingSub) {
          const { error: updateError } = await supabaseClient
            .from('subscriptions')
            .update({
              status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              price: priceAmount / 100,
              currency: currency.toUpperCase(),
              start_date: new Date().toISOString(),
              end_date: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingSub.id);

          if (updateError) {
            logStep("Error updating existing subscription", { error: updateError.message });
          } else {
            logStep("Existing subscription updated via subscription.created", { subscriptionId: existingSub.id });
          }
        } else {
          const { data: newSub, error: insertError } = await supabaseClient
            .from('subscriptions')
            .insert({
              subscriber_id: userId,
              creator_id: creatorId,
              stripe_subscription_id: stripeSubscriptionId,
              status: 'active',
              price: priceAmount / 100,
              currency: currency.toUpperCase(),
              start_date: new Date().toISOString(),
              end_date: new Date(subscription.current_period_end * 1000).toISOString(),
              auto_renew: true
            })
            .select()
            .single();

          if (insertError) {
            logStep("Error creating subscription", { error: insertError.message });
          } else {
            logStep("New subscription created via subscription.created", { subscriptionId: newSub?.id });
          }
        }

        // Notification au créateur
        const { data: creator } = await supabaseClient
          .from('creators')
          .select('user_id')
          .eq('id', creatorId)
          .single();

        if (creator) {
          const { data: subscriberProfile } = await supabaseClient
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', userId)
            .single();

          const subscriberName = subscriberProfile?.display_name || subscriberProfile?.username || 'Un utilisateur';

          await supabaseClient
            .from('notifications')
            .insert({
              user_id: creator.user_id,
              type: 'new_subscription',
              title: 'Nouvel abonnement',
              message: `${subscriberName} s'est abonné(e) à votre profil !`,
              data: {
                subscriber_id: userId,
                creator_id: creatorId
              }
            });

          logStep("New subscription notification sent to creator");
        }
      } else {
        logStep("Missing metadata in subscription", { creatorId, userId });
      }
    }

    // Gérer les événements d'abonnement (mise à jour / suppression)
    if (event.type === "customer.subscription.deleted" || 
        event.type === "customer.subscription.updated") {
      
      const subscription = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = subscription.id;
      const status = subscription.status;
      
      logStep("Processing subscription event", { 
        subscriptionId: stripeSubscriptionId, 
        status,
        eventType: event.type 
      });

      // Mapper les statuts Stripe vers nos statuts
      let newStatus: 'active' | 'canceled' | 'expired';
      if (status === 'active' || status === 'trialing') {
        newStatus = 'active';
      } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
        newStatus = 'canceled';
      } else {
        newStatus = 'expired';
      }

      // Pour les suppressions, toujours marquer comme annulé
      if (event.type === "customer.subscription.deleted") {
        newStatus = 'canceled';
      }

      // Mettre à jour l'abonnement dans notre base de données
      const { data: updatedSub, error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          end_date: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString() 
            : null
        })
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .select()
        .single();

      if (updateError) {
        logStep("Error updating subscription", { error: updateError.message });
      } else {
        logStep("Subscription updated successfully", { 
          subscriptionId: updatedSub?.id, 
          newStatus 
        });

        // Créer une notification pour l'abonné
        if (updatedSub && newStatus === 'canceled') {
          // Récupérer les infos du créateur
          const { data: creator } = await supabaseClient
            .from('creators')
            .select('stage_name, user_id')
            .eq('id', updatedSub.creator_id)
            .single();

          const { data: creatorProfile } = await supabaseClient
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', creator?.user_id)
            .single();

          const creatorName = creator?.stage_name || creatorProfile?.display_name || creatorProfile?.username || 'Créateur';

          await supabaseClient
            .from('notifications')
            .insert({
              user_id: updatedSub.subscriber_id,
              type: 'subscription_canceled',
              title: 'Abonnement annulé',
              message: `Votre abonnement à ${creatorName} a été annulé.`,
              data: {
                creator_id: updatedSub.creator_id,
                subscription_id: updatedSub.id
              }
            });

          logStep("Cancellation notification sent", { 
            subscriberId: updatedSub.subscriber_id 
          });
        }
      }
    }

    // Gérer invoice.paid - inclut la création d'abonnement ET les renouvellements
    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
      const billingReason = invoice.billing_reason;
      
      logStep("Invoice paid event", { 
        subscriptionId, 
        billingReason,
        amount: invoice.amount_paid
      });

      if (subscriptionId) {
        // Si c'est une création d'abonnement (première facture)
        if (billingReason === "subscription_create") {
          // Récupérer les metadata depuis les lignes de facture ou parent
          const lineItem = invoice.lines?.data?.[0];
          const subscriptionMetadata = invoice.parent?.subscription_details?.metadata || lineItem?.metadata || {};
          
          const creatorId = subscriptionMetadata.creator_id;
          const userId = subscriptionMetadata.user_id;

          logStep("Subscription create from invoice", { creatorId, userId, subscriptionId });

          if (creatorId && userId) {
            // Récupérer les détails de l'abonnement Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceAmount = stripeSubscription.items.data[0]?.price?.unit_amount || 0;
            const currency = stripeSubscription.items.data[0]?.price?.currency || 'eur';

            // Vérifier si un abonnement existe déjà
            const { data: existingSub } = await supabaseClient
              .from('subscriptions')
              .select('id')
              .eq('subscriber_id', userId)
              .eq('creator_id', creatorId)
              .single();

            if (existingSub) {
              const { error: updateError } = await supabaseClient
                .from('subscriptions')
                .update({
                  status: 'active',
                  stripe_subscription_id: subscriptionId,
                  price: priceAmount / 100,
                  currency: currency.toUpperCase(),
                  start_date: new Date().toISOString(),
                  end_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingSub.id);

              if (updateError) {
                logStep("Error updating subscription from invoice.paid", { error: updateError.message });
              } else {
                logStep("Subscription updated from invoice.paid", { subscriptionId: existingSub.id });
              }
            } else {
              const { data: newSub, error: insertError } = await supabaseClient
                .from('subscriptions')
                .insert({
                  subscriber_id: userId,
                  creator_id: creatorId,
                  stripe_subscription_id: subscriptionId,
                  status: 'active',
                  price: priceAmount / 100,
                  currency: currency.toUpperCase(),
                  start_date: new Date().toISOString(),
                  end_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
                  auto_renew: true
                })
                .select()
                .single();

              if (insertError) {
                logStep("Error creating subscription from invoice.paid", { error: insertError.message });
              } else {
                logStep("New subscription created from invoice.paid", { subscriptionId: newSub?.id });

                // Récupérer le taux de commission du créateur
                const { data: creator } = await supabaseClient
                  .from('creators')
                  .select('user_id, platform_commission_rate')
                  .eq('id', creatorId)
                  .single();

                // Enregistrer la commission de la plateforme (seulement si montant > 0)
                const subscriptionRevenue = priceAmount / 100;
                if (subscriptionRevenue > 0 && creator) {
                  const commissionRate = creator.platform_commission_rate || 0.15;
                  const commissionAmount = subscriptionRevenue * commissionRate;
                  const creatorPayout = subscriptionRevenue - commissionAmount;

                  const periodStart = new Date().toISOString();
                  const periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();

                  const { error: commissionError } = await supabaseClient
                    .from('platform_commissions')
                    .insert({
                      creator_id: creatorId,
                      total_revenue: subscriptionRevenue,
                      subscription_revenue: subscriptionRevenue,
                      tips_revenue: 0,
                      live_revenue: 0,
                      private_content_revenue: 0,
                      commission_rate: commissionRate,
                      commission_amount: commissionAmount,
                      creator_payout: creatorPayout,
                      currency: currency.toUpperCase(),
                      period_start: periodStart,
                      period_end: periodEnd
                    });

                  if (commissionError) {
                    logStep("Error recording platform commission", { error: commissionError.message });
                  } else {
                    logStep("Platform commission recorded", { 
                      revenue: subscriptionRevenue, 
                      commission: commissionAmount,
                      payout: creatorPayout
                    });
                  }

                  // Mettre à jour les gains totaux du créateur
                  await supabaseClient
                    .from('creators')
                    .update({ 
                      total_earnings: (await supabaseClient
                        .from('creators')
                        .select('total_earnings')
                        .eq('id', creatorId)
                        .single()).data?.total_earnings + creatorPayout || creatorPayout
                    })
                    .eq('id', creatorId);
                }

                // Notification au créateur

                if (creator) {
                  const { data: subscriberProfile } = await supabaseClient
                    .from('profiles')
                    .select('display_name, username')
                    .eq('user_id', userId)
                    .single();

                  const subscriberName = subscriberProfile?.display_name || subscriberProfile?.username || 'Un utilisateur';

                  await supabaseClient
                    .from('notifications')
                    .insert({
                      user_id: creator.user_id,
                      type: 'new_subscription',
                      title: 'Nouvel abonnement',
                      message: `${subscriberName} s'est abonné(e) à votre profil !`,
                      data: {
                        subscriber_id: userId,
                        creator_id: creatorId
                      }
                    });

                  logStep("New subscription notification sent");
                }
              }
            }
          } else {
            logStep("Missing metadata in invoice", { creatorId, userId });
          }
        } else {
          // Renouvellement normal
          const { error } = await supabaseClient
            .from('subscriptions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            logStep("Error updating subscription after payment", { error: error.message });
          } else {
            logStep("Subscription reactivated after payment");
          }
        }
      }
    }

    // Gérer l'échec de paiement
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;
      const customerEmail = invoice.customer_email;
      
      if (subscriptionId) {
        logStep("Payment failed for subscription", { subscriptionId, customerEmail });
        
        // Récupérer l'abonnement pour notifier l'utilisateur
        const { data: sub } = await supabaseClient
          .from('subscriptions')
          .select('subscriber_id, creator_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (sub) {
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: sub.subscriber_id,
              type: 'payment_failed',
              title: 'Échec de paiement',
              message: 'Le renouvellement de votre abonnement a échoué. Veuillez mettre à jour vos informations de paiement.',
              data: {
                creator_id: sub.creator_id,
                subscription_id: subscriptionId
              }
            });

          logStep("Payment failure notification sent", { subscriberId: sub.subscriber_id });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
