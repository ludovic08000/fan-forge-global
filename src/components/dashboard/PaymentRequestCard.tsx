/**
 * Compact Payment Card for Dashboard
 * Shows earnings summary with Stripe Dashboard link + Encaissement button
 * Optimized: receives revenue data from parent to avoid duplicate queries
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Banknote, Loader2, ExternalLink, CheckCircle2, AlertCircle, RefreshCw, ArrowDownToLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface RevenueBreakdown {
  subscription_revenue: number;
  tips_revenue: number;
  live_revenue: number;
  private_content_revenue: number;
  total_before_commission: number;
  commission_amount: number;
  total_after_commission: number;
}

interface PaymentRequestCardProps {
  creatorId?: string;
  revenueData?: RevenueBreakdown | null;
}

export const PaymentRequestCard: React.FC<PaymentRequestCardProps> = ({ 
  creatorId: propCreatorId,
  revenueData: propRevenueData 
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Optimisation: Query légère pour infos Stripe seulement
  const { data: creatorData, isLoading, refetch } = useQuery({
    queryKey: ['creator-stripe-info', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: creator, error } = await supabase
        .from('creators')
        .select('id, stripe_account_id, stripe_onboarding_completed, stripe_payouts_enabled, currency')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const stripeConnected = !!(
        creator.stripe_account_id && 
        creator.stripe_onboarding_completed && 
        creator.stripe_payouts_enabled
      );

      return {
        creator,
        stripeConnected,
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute cache
    gcTime: 5 * 60 * 1000,
  });

  const creatorId = propCreatorId || creatorData?.creator?.id;
  const creatorInfo = creatorData?.creator;
  const stripeConnected = creatorData?.stripeConnected ?? false;
  
  // Utiliser les données de revenus passées en prop ou du cache parent
  const cachedPaymentsData = queryClient.getQueryData<any>(['creator-payments-all', creatorId]);
  const revenueBreakdown = propRevenueData || cachedPaymentsData?.revenue as RevenueBreakdown | null;

  const handleConnectStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');
      if (error) throw error;
      if (data?.onboarding_url) {
        window.open(data.onboarding_url, '_blank');
        toast.success("Onboarding Stripe ouvert");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'ouverture de Stripe Connect");
    }
  };

  const handleOpenStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-login-link');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (e: any) {
      toast.error("Impossible d'ouvrir Stripe");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      // Invalider la query principale de paiements
      if (creatorId) {
        queryClient.invalidateQueries({ queryKey: ['creator-payments-all', creatorId] });
      }
      toast.success("Données actualisées");
    } catch (e) {
      toast.error("Erreur lors de l'actualisation");
    } finally {
      setIsRefreshing(false);
    }
  };

  const currency = creatorInfo?.currency || 'EUR';
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);

  // Calculate net earnings (what creator receives after 15% platform fee)
  const totalNet = revenueBreakdown?.total_after_commission || 0;
  const totalGross = revenueBreakdown?.total_before_commission || 0;

  if (!creatorInfo || isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center gap-4 p-6">
          {/* Left: Earnings info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Banknote className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Revenus du mois (net)</p>
              <p className="text-2xl font-bold truncate text-emerald-500">
                {formatCurrency(totalNet)}
              </p>
              {totalGross > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalGross)} brut - 15% commission
                </p>
              )}
            </div>
          </div>

          {/* Center: Status */}
          <div className="flex-1 min-w-0 md:max-w-xs">
            {stripeConnected ? (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Paiements automatiques</p>
                  <p className="text-xs text-muted-foreground">Via Stripe Connect</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Stripe non configuré</p>
                  <p className="text-xs text-muted-foreground">Configurez pour recevoir vos paiements</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="ghost"
              disabled={isRefreshing}
              className="gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            {stripeConnected ? (
              <>
                <Button
                  onClick={handleOpenStripe}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Encaisser
                </Button>
                <Button
                  onClick={handleOpenStripe}
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Stripe
                </Button>
              </>
            ) : (
              <Button onClick={handleConnectStripe} size="sm" variant="default">
                Connecter Stripe
              </Button>
            )}
          </div>
        </div>

        {/* Info banner */}
        {stripeConnected && (
          <div className="bg-muted/30 px-6 py-3 border-t border-border text-xs text-muted-foreground">
            💡 Vos revenus sont automatiquement transférés sur votre compte Stripe après chaque paiement.
            Consultez votre Dashboard Stripe pour voir les détails et programmer vos virements bancaires.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentRequestCard;