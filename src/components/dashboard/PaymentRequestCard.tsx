/**
 * Compact Payment Card for Dashboard
 * Shows earnings summary and links to Stripe Dashboard
 * 
 * Note: With Stripe Connect and transfer_data, payments are sent instantly to creators.
 * No manual withdrawal is needed - this card shows earnings overview and Stripe access.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Banknote, Loader2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
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

export const PaymentRequestCard: React.FC = () => {
  const { user } = useAuth();

  const { data: creatorData } = useQuery({
    queryKey: ['creator-payment-info', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: creator, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const stripeConnected = !!(
        creator.stripe_account_id && 
        creator.stripe_onboarding_completed && 
        creator.stripe_payouts_enabled
      );

      // Calculate period - current month
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: revenue } = await supabase.rpc('calculate_creator_revenue_with_commission', {
        creator_uuid: creator.id,
        start_date: periodStart.toISOString(),
        end_date: now.toISOString(),
      });

      return {
        creator,
        stripeConnected,
        revenueBreakdown: revenue?.[0] as RevenueBreakdown | null,
      };
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const creatorInfo = creatorData?.creator;
  const stripeConnected = creatorData?.stripeConnected ?? false;
  const revenueBreakdown = creatorData?.revenueBreakdown;

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

  const currency = creatorInfo?.currency || 'EUR';
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);

  // Calculate net earnings (what creator receives after 15% platform fee)
  const totalNet = revenueBreakdown?.total_after_commission || 0;
  const totalGross = revenueBreakdown?.total_before_commission || 0;

  if (!creatorInfo) {
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
            {stripeConnected ? (
              <Button
                onClick={handleOpenStripe}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Dashboard Stripe
              </Button>
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
