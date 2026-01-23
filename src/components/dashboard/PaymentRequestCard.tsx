/**
 * Compact Payment Request Card for Dashboard
 * Displays available balance and quick payout button
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Banknote, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCsrfToken } from '@/hooks/useCsrfToken';

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
  const { token: csrfToken, generateToken } = useCsrfToken();
  const [loading, setLoading] = useState(false);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    if (user) {
      loadCreatorInfo();
    }
  }, [user]);

  const loadCreatorInfo = async () => {
    if (!user) return;

    try {
      const { data: creator, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCreatorInfo(creator);

      setStripeConnected(
        creator.stripe_account_id && 
        creator.stripe_onboarding_completed && 
        creator.stripe_payouts_enabled
      );

      // Calculate available revenue
      const now = new Date();
      let periodStart: Date;

      if (creator.payment_frequency === 'weekly') {
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (creator.payment_frequency === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
      }

      const { data: revenue } = await supabase.rpc('calculate_creator_revenue_with_commission', {
        creator_uuid: creator.id,
        start_date: periodStart.toISOString(),
        end_date: now.toISOString(),
      });

      if (revenue && revenue.length > 0) {
        setRevenueBreakdown(revenue[0]);
      }
    } catch (error) {
      console.error('Error loading creator:', error);
    }
  };

  const handleRequestPayment = async () => {
    if (!creatorInfo || !stripeConnected) return;

    setLoading(true);
    try {
      const token = csrfToken || await generateToken();
      if (!token) {
        toast.error('Erreur de sécurité. Veuillez rafraîchir la page.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('request-creator-payment', {
        body: { csrfToken: token }
      });

      if (error) throw error;
      toast.success(data.message);
      loadCreatorInfo();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la demande de paiement');
    } finally {
      setLoading(false);
    }
  };

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
        window.open(data.url, '_blank');
      }
    } catch (e: any) {
      toast.error("Impossible d'ouvrir Stripe");
    }
  };

  const MIN_WITHDRAWAL = 1;
  const currentAmount = revenueBreakdown?.total_after_commission || 0;
  const canWithdraw = currentAmount >= MIN_WITHDRAWAL;
  const currency = creatorInfo?.currency || 'EUR';
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
  const progressPercent = Math.min(100, (currentAmount / MIN_WITHDRAWAL) * 100);

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
          {/* Left: Balance info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Banknote className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Solde disponible</p>
              <p className={`text-2xl font-bold truncate ${canWithdraw ? 'text-emerald-500' : 'text-foreground'}`}>
                {formatCurrency(currentAmount)}
              </p>
            </div>
          </div>

          {/* Center: Progress bar (mobile: full width) */}
          <div className="flex-1 min-w-0 md:max-w-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{canWithdraw ? '✅ Retrait disponible' : '⏳ Seuil minimum'}</span>
                <span>{formatCurrency(MIN_WITHDRAWAL)}</span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-2"
              />
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {stripeConnected ? (
              <>
                <Button
                  onClick={handleRequestPayment}
                  disabled={loading || !canWithdraw}
                  size="sm"
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Banknote className="h-4 w-4" />
                  )}
                  Retirer
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleOpenStripe}
                  className="gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
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
      </CardContent>
    </Card>
  );
};

export default PaymentRequestCard;
