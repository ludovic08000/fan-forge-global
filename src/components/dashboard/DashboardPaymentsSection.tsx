/**
 * Section Paiements du Dashboard créateur - Design Premium
 * Layout: Encaissements (top) → Stats → Historique → Stripe (bottom)
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Banknote, 
  Users, 
  Heart, 
  MessageCircle, 
  Radio,
  TrendingUp,
  ArrowDownRight,
  Wallet,
  Clock,
  Gift
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import StripeConnectSetup from '@/components/creator/StripeConnectSetup';
import { PaymentRequestCard } from './PaymentRequestCard';
import { toast } from 'sonner';

interface EncaissementItem {
  id: string;
  type: 'subscription' | 'tip' | 'private_content' | 'live';
  amount: number;
  currency: string;
  description: string;
  senderName: string | null;
  createdAt: string;
}

interface DashboardPaymentsSectionProps {
  creatorId: string;
}

export const DashboardPaymentsSection: React.FC<DashboardPaymentsSectionProps> = ({ creatorId }) => {
  const { user } = useAuth();
  const [isAcceptingTips, setIsAcceptingTips] = useState(true);
  const [savingTips, setSavingTips] = useState(false);

  // ══════════════════════════════════════════════════════════════════
  // OPTIMISATION: Une seule query pour TOUTES les données de paiement
  // ══════════════════════════════════════════════════════════════════
  const { data: paymentData, isLoading } = useQuery({
    queryKey: ['creator-payments-all', creatorId],
    queryFn: async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Exécuter TOUTES les requêtes en parallèle
      const [
        revenueResult,
        creatorResult,
        subscriptionsResult,
        tipsResult,
        privateResult,
        liveResult
      ] = await Promise.all([
        // 1. Revenue RPC
        supabase.rpc('calculate_creator_revenue_with_commission', {
          creator_uuid: creatorId,
          start_date: periodStart.toISOString(),
          end_date: now.toISOString(),
        }),
        // 2. Creator info (tips setting)
        supabase
          .from('creators')
          .select('is_accepting_tips')
          .eq('id', creatorId)
          .single(),
        // 3. Subscriptions
        supabase
          .from('subscriptions')
          .select(`
            id, price, currency, created_at, subscriber_id,
            profiles:subscriber_id(display_name, username)
          `)
          .eq('creator_id', creatorId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20),
        // 4. Tips (only paid)
        supabase
          .from('tips')
          .select(`
            id, amount, currency, message, created_at, sender_id,
            profiles:sender_id(display_name, username)
          `)
          .eq('creator_id', creatorId)
          .not('stripe_payment_intent_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20),
        // 5. Private content payments
        supabase
          .from('private_content_payments')
          .select(`
            id, amount, currency, created_at, subscriber_id,
            profiles:subscriber_id(display_name, username),
            private_messages!inner(creator_id)
          `)
          .eq('status', 'paid')
          .eq('private_messages.creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(20),
        // 6. Live payments
        supabase
          .from('live_stream_payments')
          .select(`
            id, amount, currency, created_at, subscriber_id,
            profiles:subscriber_id(display_name, username),
            live_streams!inner(title, creator_id)
          `)
          .eq('status', 'paid')
          .eq('live_streams.creator_id', creatorId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      return {
        revenue: revenueResult.data?.[0] as {
          subscription_revenue: number;
          tips_revenue: number;
          live_revenue: number;
          private_content_revenue: number;
          total_before_commission: number;
          commission_amount: number;
          total_after_commission: number;
        } | null,
        isAcceptingTips: creatorResult.data?.is_accepting_tips ?? true,
        subscriptions: subscriptionsResult.data || [],
        tips: tipsResult.data || [],
        privatePayments: privateResult.data || [],
        livePayments: liveResult.data || [],
      };
    },
    enabled: !!creatorId,
    staleTime: 60 * 1000, // 1 minute cache
    gcTime: 5 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Sync tips setting from query
  useEffect(() => {
    if (paymentData?.isAcceptingTips !== undefined) {
      setIsAcceptingTips(paymentData.isAcceptingTips);
    }
  }, [paymentData?.isAcceptingTips]);

  const handleTipsToggle = async (checked: boolean) => {
    setSavingTips(true);
    try {
      const { error } = await supabase
        .from('creators')
        .update({ is_accepting_tips: checked })
        .eq('id', creatorId);
      
      if (error) throw error;
      setIsAcceptingTips(checked);
      toast.success(checked ? 'Pourboires activés' : 'Pourboires désactivés');
    } catch (error) {
      console.error('Error updating tips setting:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSavingTips(false);
    }
  };

  // Extract data from unified query
  const revenueData = paymentData?.revenue;
  const subscriptions = paymentData?.subscriptions;
  const tips = paymentData?.tips;
  const privatePayments = paymentData?.privatePayments;
  const livePayments = paymentData?.livePayments;

  // Combiner tous les encaissements
  const allEncaissements: EncaissementItem[] = [
    ...(subscriptions?.map(s => ({
      id: s.id,
      type: 'subscription' as const,
      amount: s.price,
      currency: s.currency || 'EUR',
      description: 'Nouvel abonnement',
      senderName: (s.profiles as any)?.display_name || (s.profiles as any)?.username || 'Anonyme',
      createdAt: s.created_at,
    })) || []),
    ...(tips?.map(t => ({
      id: t.id,
      type: 'tip' as const,
      amount: t.amount,
      currency: t.currency || 'EUR',
      description: t.message || 'Tip reçu',
      senderName: (t.profiles as any)?.display_name || (t.profiles as any)?.username || 'Anonyme',
      createdAt: t.created_at,
    })) || []),
    ...(privatePayments?.map(p => ({
      id: p.id,
      type: 'private_content' as const,
      amount: p.amount,
      currency: p.currency || 'EUR',
      description: 'Contenu privé',
      senderName: (p.profiles as any)?.display_name || (p.profiles as any)?.username || 'Anonyme',
      createdAt: p.created_at,
    })) || []),
    ...(livePayments?.map(p => ({
      id: p.id,
      type: 'live' as const,
      amount: p.amount,
      currency: p.currency || 'EUR',
      description: (p.live_streams as any)?.title || 'Live',
      senderName: (p.profiles as any)?.display_name || (p.profiles as any)?.username || 'Anonyme',
      createdAt: p.created_at,
    })) || []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Utiliser les données RPC pour les totaux (source de vérité)
  const totals = {
    subscriptions: revenueData?.subscription_revenue || 0,
    tips: revenueData?.tips_revenue || 0,
    privateContent: revenueData?.private_content_revenue || 0,
    live: revenueData?.live_revenue || 0,
  };
  const totalGross = revenueData?.total_before_commission || 0;
  const commission = revenueData?.commission_amount || 0;
  const totalNet = revenueData?.total_after_commission || 0;

  // isLoading is already defined from the unified query above

  const getTypeConfig = (type: EncaissementItem['type']) => {
    const configs = {
      subscription: { icon: Users, label: 'Abo', color: 'bg-primary text-primary-foreground' },
      tip: { icon: Heart, label: 'Tip', color: 'bg-pink-500 text-white' },
      private_content: { icon: MessageCircle, label: 'MP', color: 'bg-purple-500 text-white' },
      live: { icon: Radio, label: 'Live', color: 'bg-red-500 text-white' },
    };
    return configs[type];
  };

  const formatAmount = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════════
          1. ENCAISSEMENTS - Solde & Retrait (EN HAUT)
      ══════════════════════════════════════════════════════════════════ */}
      <PaymentRequestCard creatorId={creatorId} revenueData={revenueData} />

      {/* ══════════════════════════════════════════════════════════════════
          2. TABLEAU RÉCAPITULATIF DES REVENUS
      ══════════════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Récapitulatif des revenus
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tableau aligné avec colonnes fixes */}
          <table className="w-full">
            <thead>
              <tr className="text-xs font-medium text-muted-foreground bg-muted/30">
                <th className="p-3 text-left w-[40%]">Source</th>
                <th className="p-3 text-right w-[20%]">Montant</th>
                <th className="p-3 text-right w-[20%]">Commission</th>
                <th className="p-3 text-right w-[20%]">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Abonnements */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-sm">Abonnements</span>
                  </div>
                </td>
                <td className="p-3 text-right font-mono text-sm tabular-nums">{formatAmount(totals.subscriptions)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.subscriptions * (15 / 100))}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.subscriptions * (85 / 100))}</td>
              </tr>
              
              {/* Tips */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
                      <Heart className="h-4 w-4 text-pink-500" />
                    </div>
                    <span className="font-medium text-sm">Tips</span>
                  </div>
                </td>
                <td className="p-3 text-right font-mono text-sm tabular-nums">{formatAmount(totals.tips)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.tips * (15 / 100))}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.tips * (85 / 100))}</td>
              </tr>
              
              {/* Messages privés */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="font-medium text-sm">Messages privés</span>
                  </div>
                </td>
                <td className="p-3 text-right font-mono text-sm tabular-nums">{formatAmount(totals.privateContent)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.privateContent * (15 / 100))}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.privateContent * (85 / 100))}</td>
              </tr>
              
              {/* Lives */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <Radio className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="font-medium text-sm">Lives</span>
                  </div>
                </td>
                <td className="p-3 text-right font-mono text-sm tabular-nums">{formatAmount(totals.live)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.live * (15 / 100))}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.live * (85 / 100))}</td>
              </tr>
            </tbody>
            {/* Total row dans tfoot pour alignement parfait */}
            <tfoot>
              <tr className="bg-gradient-to-r from-primary/5 to-emerald-500/5 border-t-2 border-border">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Wallet className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-sm">TOTAL</span>
                  </div>
                </td>
                <td className="p-4 text-right font-mono text-base tabular-nums font-bold">{formatAmount(totalGross)}</td>
                <td className="p-4 text-right font-mono text-base tabular-nums font-bold text-amber-600">-{formatAmount(commission)}</td>
                <td className="p-4 text-right font-mono text-base tabular-nums font-bold text-emerald-600">{formatAmount(totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          3. HISTORIQUE DES TRANSACTIONS
      ══════════════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Historique des encaissements
            <Badge variant="secondary" className="ml-auto font-mono text-xs">
              {allEncaissements.length} transactions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allEncaissements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucune transaction pour le moment</p>
            </div>
          ) : (
            <ScrollArea className="h-[360px]">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="text-xs font-medium text-muted-foreground bg-muted/30">
                    <th className="p-3 text-left w-[15%]">Type</th>
                    <th className="p-3 text-left w-[35%]">De</th>
                    <th className="p-3 text-right w-[25%]">Montant</th>
                    <th className="p-3 text-right w-[25%]">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allEncaissements.map((item) => {
                    const config = getTypeConfig(item.type);
                    const Icon = config.icon;
                    return (
                      <tr
                        key={`${item.type}-${item.id}`}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-3">
                          <Badge className={`${config.color} text-[10px] px-1.5 py-0.5`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <p className="text-sm font-medium truncate">{item.senderName}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-sm tabular-nums font-semibold text-emerald-600">
                            +{formatAmount(item.amount)}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(item.createdAt), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          4. OPTIONS DE PAIEMENT
      ══════════════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-pink-500" />
            Options de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <Label htmlFor="acceptTips" className="font-medium">Pourboires (Tips)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Permettre à vos fans de vous envoyer des pourboires
              </p>
            </div>
            <Switch
              id="acceptTips"
              checked={isAcceptingTips}
              onCheckedChange={handleTipsToggle}
              disabled={savingTips}
            />
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          5. STRIPE CONNECT (EN BAS)
      ══════════════════════════════════════════════════════════════════ */}
      <StripeConnectSetup />
    </div>
  );
};

export default DashboardPaymentsSection;
