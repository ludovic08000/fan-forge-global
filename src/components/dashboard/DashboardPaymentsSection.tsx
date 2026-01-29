/**
 * Section Paiements du Dashboard créateur - Design Premium
 * Layout: Encaissements (top) → Stats → Historique → Stripe (bottom)
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Banknote, 
  Users, 
  Heart, 
  MessageCircle, 
  Radio,
  TrendingUp,
  ArrowDownRight,
  Wallet,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import StripeConnectSetup from '@/components/creator/StripeConnectSetup';
import { PaymentRequestCard } from './PaymentRequestCard';

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

  // Revenus réels via RPC (source de vérité)
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['creator-revenue-rpc', creatorId],
    queryFn: async () => {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data, error } = await supabase.rpc('calculate_creator_revenue_with_commission', {
        creator_uuid: creatorId,
        start_date: periodStart.toISOString(),
        end_date: now.toISOString(),
      });
      
      if (error) throw error;
      return data?.[0] as {
        subscription_revenue: number;
        tips_revenue: number;
        live_revenue: number;
        private_content_revenue: number;
        total_before_commission: number;
        commission_amount: number;
        total_after_commission: number;
      } | null;
    },
    enabled: !!creatorId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Subscriptions avec refresh temps réel
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['creator-subscriptions', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id, price, currency, created_at, subscriber_id,
          profiles:subscriber_id(display_name, username)
        `)
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Tips - SEULEMENT ceux avec stripe_payment_intent_id (réellement payés)
  const { data: tips, isLoading: tipsLoading } = useQuery({
    queryKey: ['creator-tips', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tips')
        .select(`
          id, amount, currency, message, created_at, sender_id, stripe_payment_intent_id,
          profiles:sender_id(display_name, username)
        `)
        .eq('creator_id', creatorId)
        .not('stripe_payment_intent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId,
    staleTime: 30 * 1000, // 30 secondes pour refresh plus fréquent
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh toutes les minutes
  });

  const { data: privatePayments, isLoading: privateLoading } = useQuery({
    queryKey: ['creator-private-payments', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('private_content_payments')
        .select(`
          id, amount, currency, created_at, subscriber_id, message_id,
          profiles:subscriber_id(display_name, username),
          private_messages!inner(creator_id)
        `)
        .eq('status', 'paid')
        .eq('private_messages.creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: livePayments, isLoading: liveLoading } = useQuery({
    queryKey: ['creator-live-payments', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_stream_payments')
        .select(`
          id, amount, currency, created_at, subscriber_id, live_stream_id,
          profiles:subscriber_id(display_name, username),
          live_streams!inner(title, creator_id)
        `)
        .eq('status', 'paid')
        .eq('live_streams.creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

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

  const isLoading = subsLoading || tipsLoading || privateLoading || liveLoading || revenueLoading;

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
      <PaymentRequestCard />

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
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.subscriptions * 0.15)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.subscriptions * 0.85)}</td>
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
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.tips * 0.15)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.tips * 0.85)}</td>
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
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.privateContent * 0.15)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.privateContent * 0.85)}</td>
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
                <td className="p-3 text-right font-mono text-sm tabular-nums text-amber-600">-{formatAmount(totals.live * 0.15)}</td>
                <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold text-emerald-600">{formatAmount(totals.live * 0.85)}</td>
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
          4. STRIPE CONNECT (EN BAS)
      ══════════════════════════════════════════════════════════════════ */}
      <StripeConnectSetup />
    </div>
  );
};

export default DashboardPaymentsSection;
