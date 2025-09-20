import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
  plan_name: string;
}

// Plans disponibles
export const SUBSCRIPTION_PLANS = {
  standard: {
    price_id: 'price_1S9QHMG4R6fTor2dvjuIU5kU',
    product_id: 'prod_T5bU6bdaZ3RsYj',
    name: 'Créateur Standard',
    price: 9.99,
    features: [
      'Upload illimité',
      'Analytics de base', 
      'Gestion des abonnés',
      'Support par email'
    ]
  },
  premium: {
    price_id: 'price_1S9QHWG4R6fTor2dMi4kXjjY',
    product_id: 'prod_T5bUI1S3UbmTBQ',
    name: 'Créateur Premium',
    price: 19.99,
    features: [
      'Tout du plan Standard',
      'Analytics avancées',
      'Outils de promotion',
      'Codes de parrainage illimités',
      'Support prioritaire',
      'Mise en avant payante'
    ]
  }
} as const;

export const useSubscription = () => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Vérifier le statut d'abonnement
  const { 
    data: subscriptionStatus, 
    isLoading, 
    error,
    refetch: checkSubscription 
  } = useQuery({
    queryKey: ['subscription-status', user?.id],
    queryFn: async () => {
      if (!user || !session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data as SubscriptionStatus;
    },
    enabled: !!user && !!session,
    refetchInterval: 60000, // Rafraîchir chaque minute
    staleTime: 30000, // Données fraîches pendant 30s
  });

  // Créer une session de checkout
  const createCheckoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      if (!user || !session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      console.error('Checkout error:', error);
      toast.error('Erreur lors de la création du checkout : ' + error.message);
    }
  });

  // Accéder au portail client Stripe
  const openCustomerPortalMutation = useMutation({
    mutationFn: async () => {
      if (!user || !session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error: any) => {
      console.error('Customer portal error:', error);
      toast.error('Erreur lors de l\'accès au portail : ' + error.message);
    }
  });

  // Actualiser le statut après paiement
  const refreshSubscription = async () => {
    await checkSubscription();
    // Invalider toutes les requêtes liées aux abonnements
    queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
  };

  // Helpers
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const currentPlan = subscriptionStatus?.plan_name || 'Gratuit';
  const isPremium = subscriptionStatus?.product_id === SUBSCRIPTION_PLANS.premium.product_id;
  const isStandard = subscriptionStatus?.product_id === SUBSCRIPTION_PLANS.standard.product_id;

  // Vérifier si l'abonnement expire bientôt (dans les 7 jours)
  const isExpiringSoon = () => {
    if (!subscriptionStatus?.subscription_end) return false;
    const endDate = new Date(subscriptionStatus.subscription_end);
    const now = new Date();
    const diffInDays = (endDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffInDays <= 7;
  };

  // Formater la date d'expiration
  const formatExpirationDate = () => {
    if (!subscriptionStatus?.subscription_end) return null;
    return new Date(subscriptionStatus.subscription_end).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return {
    // Data
    subscriptionStatus,
    isSubscribed,
    currentPlan,
    isPremium,
    isStandard,
    
    // State
    isLoading,
    error,
    
    // Actions
    createCheckout: createCheckoutMutation.mutate,
    openCustomerPortal: openCustomerPortalMutation.mutate,
    refreshSubscription,
    checkSubscription,
    
    // Loading states
    isCreatingCheckout: createCheckoutMutation.isPending,
    isOpeningPortal: openCustomerPortalMutation.isPending,
    
    // Helpers
    isExpiringSoon: isExpiringSoon(),
    expirationDate: formatExpirationDate(),
    
    // Plans
    plans: SUBSCRIPTION_PLANS
  };
};