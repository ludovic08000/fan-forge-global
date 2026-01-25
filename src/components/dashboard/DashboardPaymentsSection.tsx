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

  // Queries avec cache optimisé
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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: tips, isLoading: tipsLoading } = useQuery({
    queryKey: ['creator-tips', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tips')
        .select(`
          id, amount, currency, message, created_at, sender_id,
          profiles:sender_id(display_name, username)
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
        .eq('status', 'completed')
        .eq('private_messages.creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
        .eq('status', 'completed')
        .eq('live_streams.creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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

  // Calcul des totaux
  const totals = {
    subscriptions: subscriptions?.reduce((sum, s) => sum + (s.price || 0), 0) || 0,
    tips: tips?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
    privateContent: privatePayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    live: livePayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
  };
  const totalGross = totals.subscriptions + totals.tips + totals.privateContent + totals.live;
  const commission = totalGross * 0.15;
  const totalNet = totalGross - commission;

  const isLoading = subsLoading || tipsLoading || privateLoading || liveLoading;

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
          {/* Tableau aligné */}
          <div className="divide-y divide-border">
            {/* Header row */}
            <div className="grid grid-cols-4 gap-0 text-xs font-medium text-muted-foreground bg-muted/30">
              <div className="p-3 text-left">Source</div>
              <div className="p-3 text-right">Montant</div>
              <div className="p-3 text-right">Commission</div>
              <div className="p-3 text-right">Net</div>
            </div>
            
            {/* Abonnements */}
            <div className="grid grid-cols-4 gap-0 items-center hover:bg-muted/20 transition-colors">
              <div className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium text-sm">Abonnements</span>
              </div>
              <div className="p-3 text-right font-mono text-sm">{formatAmount(totals.subscriptions)}</div>
              <div className="p-3 text-right font-mono text-sm text-amber-600">-{formatAmount(totals.subscriptions * 0.15)}</div>
              <div className="p-3 text-right font-mono text-sm font-semibold text-emerald-600">{formatAmount(totals.subscriptions * 0.85)}</div>
            </div>
            
            {/* Tips */}
            <div className="grid grid-cols-4 gap-0 items-center hover:bg-muted/20 transition-colors">
              <div className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-pink-500" />
                </div>
                <span className="font-medium text-sm">Tips</span>
              </div>
              <div className="p-3 text-right font-mono text-sm">{formatAmount(totals.tips)}</div>
              <div className="p-3 text-right font-mono text-sm text-amber-600">-{formatAmount(totals.tips * 0.15)}</div>
              <div className="p-3 text-right font-mono text-sm font-semibold text-emerald-600">{formatAmount(totals.tips * 0.85)}</div>
            </div>
            
            {/* Messages privés */}
            <div className="grid grid-cols-4 gap-0 items-center hover:bg-muted/20 transition-colors">
              <div className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-purple-500" />
                </div>
                <span className="font-medium text-sm">Messages privés</span>
              </div>
              <div className="p-3 text-right font-mono text-sm">{formatAmount(totals.privateContent)}</div>
              <div className="p-3 text-right font-mono text-sm text-amber-600">-{formatAmount(totals.privateContent * 0.15)}</div>
              <div className="p-3 text-right font-mono text-sm font-semibold text-emerald-600">{formatAmount(totals.privateContent * 0.85)}</div>
            </div>
            
            {/* Lives */}
            <div className="grid grid-cols-4 gap-0 items-center hover:bg-muted/20 transition-colors">
              <div className="p-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-red-500" />
                </div>
                <span className="font-medium text-sm">Lives</span>
              </div>
              <div className="p-3 text-right font-mono text-sm">{formatAmount(totals.live)}</div>
              <div className="p-3 text-right font-mono text-sm text-amber-600">-{formatAmount(totals.live * 0.15)}</div>
              <div className="p-3 text-right font-mono text-sm font-semibold text-emerald-600">{formatAmount(totals.live * 0.85)}</div>
            </div>
            
            {/* Total row */}
            <div className="grid grid-cols-4 gap-0 items-center bg-gradient-to-r from-primary/5 to-emerald-500/5">
              <div className="p-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm">TOTAL</span>
              </div>
              <div className="p-4 text-right font-mono text-base font-bold">{formatAmount(totalGross)}</div>
              <div className="p-4 text-right font-mono text-base font-bold text-amber-600">-{formatAmount(commission)}</div>
              <div className="p-4 text-right font-mono text-lg font-bold text-emerald-600">{formatAmount(totalNet)}</div>
            </div>
          </div>
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
              <div className="divide-y divide-border">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground bg-muted/30 sticky top-0">
                  <div className="col-span-2 p-3">Type</div>
                  <div className="col-span-4 p-3">De</div>
                  <div className="col-span-3 p-3 text-right">Montant</div>
                  <div className="col-span-3 p-3 text-right">Date</div>
                </div>
                
                {allEncaissements.map((item) => {
                  const config = getTypeConfig(item.type);
                  const Icon = config.icon;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="grid grid-cols-12 gap-2 items-center hover:bg-muted/20 transition-colors"
                    >
                      <div className="col-span-2 p-3">
                        <Badge className={`${config.color} text-[10px] px-1.5 py-0.5`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="col-span-4 p-3">
                        <p className="text-sm font-medium truncate">{item.senderName}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <div className="col-span-3 p-3 text-right">
                        <span className="font-mono text-sm font-semibold text-emerald-600">
                          +{formatAmount(item.amount)}
                        </span>
                      </div>
                      <div className="col-span-3 p-3 text-right">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
