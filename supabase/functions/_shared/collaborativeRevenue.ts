import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COLLABORATIVE-REVENUE] ${step}${detailsStr}`);
};

interface Partnership {
  id: string;
  requester_id: string;
  partner_id: string;
  revenue_share_requester: number;
  revenue_share_partner: number;
  status: string;
}

interface Creator {
  id: string;
  stripe_account_id: string | null;
  user_id: string;
}

/**
 * Vérifie si un contenu est collaboratif et récupère les informations du partenariat
 */
export async function getCollaborativeContentInfo(
  supabaseClient: SupabaseClient,
  contentId: string
): Promise<{ isCollaborative: boolean; partnership?: Partnership; primaryCreatorId?: string }> {
  try {
    const { data: collabContent, error } = await supabaseClient
      .from('collaborative_content')
      .select(`
        partnership_id,
        primary_creator_id,
        creator_partnerships (
          id,
          requester_id,
          partner_id,
          revenue_share_requester,
          revenue_share_partner,
          status
        )
      `)
      .eq('content_id', contentId)
      .single();

    if (error || !collabContent) {
      return { isCollaborative: false };
    }

    const partnership = collabContent.creator_partnerships as unknown as Partnership;
    
    if (!partnership || partnership.status !== 'accepted') {
      return { isCollaborative: false };
    }

    return {
      isCollaborative: true,
      partnership,
      primaryCreatorId: collabContent.primary_creator_id
    };
  } catch (err) {
    logStep("Error checking collaborative content", { error: String(err) });
    return { isCollaborative: false };
  }
}

/**
 * Calcule et effectue le partage des revenus pour un contenu collaboratif
 */
export async function processCollaborativeRevenue(
  stripe: Stripe,
  supabaseClient: SupabaseClient,
  params: {
    contentId: string;
    primaryCreatorId: string;
    totalAmount: number; // Montant après commission plateforme (85%)
    currency: string;
    paymentIntentId?: string;
    revenueType: 'subscription' | 'tip' | 'private_content' | 'live';
  }
): Promise<{ success: boolean; transfers?: Array<{ creatorId: string; amount: number }> }> {
  const { contentId, primaryCreatorId, totalAmount, currency, paymentIntentId, revenueType } = params;

  try {
    logStep("Processing collaborative revenue", { contentId, primaryCreatorId, totalAmount, revenueType });

    // Récupérer les infos du contenu collaboratif
    const collabInfo = await getCollaborativeContentInfo(supabaseClient, contentId);
    
    if (!collabInfo.isCollaborative || !collabInfo.partnership) {
      logStep("Content is not collaborative or partnership not active");
      return { success: false };
    }

    const partnership = collabInfo.partnership;
    
    // Déterminer les parts de chaque créateur
    const isPrimaryRequester = primaryCreatorId === partnership.requester_id;
    const primaryShare = isPrimaryRequester 
      ? partnership.revenue_share_requester 
      : partnership.revenue_share_partner;
    const partnerShare = isPrimaryRequester 
      ? partnership.revenue_share_partner 
      : partnership.revenue_share_requester;
    const partnerId = isPrimaryRequester 
      ? partnership.partner_id 
      : partnership.requester_id;

    logStep("Revenue shares calculated", { 
      primaryCreatorId, 
      partnerId, 
      primaryShare, 
      partnerShare 
    });

    // Calculer les montants
    const primaryAmount = (totalAmount * primaryShare) / 100;
    const partnerAmount = (totalAmount * partnerShare) / 100;

    // Récupérer les comptes Stripe des deux créateurs
    const { data: creators, error: creatorsError } = await supabaseClient
      .from('creators')
      .select('id, stripe_account_id, user_id')
      .in('id', [primaryCreatorId, partnerId]);

    if (creatorsError || !creators || creators.length < 2) {
      logStep("Error fetching creators", { error: creatorsError?.message });
      return { success: false };
    }

    const primaryCreator = creators.find(c => c.id === primaryCreatorId) as Creator;
    const partnerCreator = creators.find(c => c.id === partnerId) as Creator;

    if (!primaryCreator?.stripe_account_id || !partnerCreator?.stripe_account_id) {
      logStep("One or both creators don't have Stripe Connect", {
        primaryHasStripe: !!primaryCreator?.stripe_account_id,
        partnerHasStripe: !!partnerCreator?.stripe_account_id
      });
      return { success: false };
    }

    const transfers: Array<{ creatorId: string; amount: number }> = [];

    // Effectuer le transfert au partenaire (le créateur principal reçoit déjà via le paiement initial)
    // Note: Dans le flux normal, le paiement va directement au créateur principal via transfer_data
    // Ici on fait un transfert supplémentaire au partenaire
    if (partnerAmount > 0.50) { // Minimum 0.50€ pour un transfert Stripe
      try {
        const transferAmountCents = Math.round(partnerAmount * 100);
        
        const transfer = await stripe.transfers.create({
          amount: transferAmountCents,
          currency: currency.toLowerCase(),
          destination: partnerCreator.stripe_account_id,
          transfer_group: paymentIntentId || `collab_${contentId}`,
          metadata: {
            type: 'collaborative_revenue',
            content_id: contentId,
            partnership_id: partnership.id,
            primary_creator_id: primaryCreatorId,
            partner_creator_id: partnerId,
            revenue_type: revenueType
          }
        });

        logStep("Transfer to partner created", { 
          transferId: transfer.id, 
          amount: partnerAmount,
          destination: partnerCreator.stripe_account_id
        });

        transfers.push({ creatorId: partnerId, amount: partnerAmount });

        // Notifier le partenaire
        await supabaseClient.from('notifications').insert({
          user_id: partnerCreator.user_id,
          type: 'collaborative_revenue',
          title: 'Revenu collaboratif reçu !',
          message: `Vous avez reçu ${partnerAmount.toFixed(2)}€ pour un contenu collaboratif.`,
          data: {
            content_id: contentId,
            partnership_id: partnership.id,
            amount: partnerAmount,
            revenue_type: revenueType
          }
        });

      } catch (transferError) {
        logStep("Error creating transfer", { error: String(transferError) });
        // On continue même si le transfert échoue - on peut réessayer plus tard
      }
    }

    // Enregistrer la transaction collaborative
    const { error: insertError } = await supabaseClient
      .from('collaborative_revenue_transactions')
      .insert({
        content_id: contentId,
        partnership_id: partnership.id,
        primary_creator_id: primaryCreatorId,
        partner_creator_id: partnerId,
        total_amount: totalAmount,
        primary_amount: primaryAmount,
        partner_amount: partnerAmount,
        currency: currency.toUpperCase(),
        revenue_type: revenueType,
        stripe_transfer_id: transfers.length > 0 ? transfers[0].creatorId : null,
        status: transfers.length > 0 ? 'completed' : 'pending'
      });

    if (insertError) {
      logStep("Error recording collaborative transaction", { error: insertError.message });
    }

    return { success: true, transfers };

  } catch (error) {
    logStep("Error processing collaborative revenue", { error: String(error) });
    return { success: false };
  }
}
