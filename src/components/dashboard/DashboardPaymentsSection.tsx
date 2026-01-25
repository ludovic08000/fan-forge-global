/**
 * Section Paiements du Dashboard créateur
 * Affiche les encaissements (abonnements, tips, contenus privés, lives)
 * et la configuration Stripe Connect
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Banknote, 
  Users, 
  Heart, 
  MessageCircle, 
  Radio,
  Euro
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

  // Récupérer les abonnements - avec cache long
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['creator-subscriptions', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          price,
          currency,
          created_at,
          subscriber_id,
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
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
    gcTime: 5 * 60 * 1000,
  });

  // Récupérer les tips - avec cache long
  const { data: tips, isLoading: tipsLoading } = useQuery({
    queryKey: ['creator-tips', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tips')
        .select(`
          id,
          amount,
          currency,
          message,
          created_at,
          sender_id,
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

  // Récupérer les paiements de contenus privés - optimisé avec une seule requête via join
  const { data: privatePayments, isLoading: privateLoading } = useQuery({
    queryKey: ['creator-private-payments', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('private_content_payments')
        .select(`
          id,
          amount,
          currency,
          created_at,
          subscriber_id,
          message_id,
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

  // Récupérer les paiements des lives - optimisé avec join
  const { data: livePayments, isLoading: liveLoading } = useQuery({
    queryKey: ['creator-live-payments', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_stream_payments')
        .select(`
          id,
          amount,
          currency,
          created_at,
          subscriber_id,
          live_stream_id,
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
      description: 'Contenu privé débloqué',
      senderName: (p.profiles as any)?.display_name || (p.profiles as any)?.username || 'Anonyme',
      createdAt: p.created_at,
    })) || []),
    ...(livePayments?.map(p => ({
      id: p.id,
      type: 'live' as const,
      amount: p.amount,
      currency: p.currency || 'EUR',
      description: `Accès live: ${(p.live_streams as any)?.title || 'Live'}`,
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

  const getTypeIcon = (type: EncaissementItem['type']) => {
    switch (type) {
      case 'subscription': return <Users className="h-4 w-4" />;
      case 'tip': return <Heart className="h-4 w-4" />;
      case 'private_content': return <MessageCircle className="h-4 w-4" />;
      case 'live': return <Radio className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: EncaissementItem['type']) => {
    switch (type) {
      case 'subscription': return <Badge variant="default">Abonnement</Badge>;
      case 'tip': return <Badge className="bg-pink-500">Tip</Badge>;
      case 'private_content': return <Badge className="bg-purple-500">Message privé</Badge>;
      case 'live': return <Badge className="bg-red-500">Live</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Abonnements</p>
                <p className="text-lg font-bold">{totals.subscriptions.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tips</p>
                <p className="text-lg font-bold">{totals.tips.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages privés</p>
                <p className="text-lg font-bold">{totals.privateContent.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Radio className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lives</p>
                <p className="text-lg font-bold">{totals.live.toFixed(2)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Revenus bruts</p>
              <p className="text-2xl font-bold">{totalGross.toFixed(2)}€</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Commission (15%)</p>
              <p className="text-2xl font-bold text-amber-500">-{commission.toFixed(2)}€</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Revenus nets</p>
              <p className="text-2xl font-bold text-emerald-500">{totalNet.toFixed(2)}€</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Solde disponible & Retrait */}
      <PaymentRequestCard />

      {/* Encaissements List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Historique des encaissements
          </CardTitle>
          <CardDescription>
            Tous vos revenus récents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allEncaissements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Euro className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucun encaissement pour le moment</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {allEncaissements.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {getTypeIcon(item.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeBadge(item.type)}
                          <span className="text-sm text-muted-foreground">
                            de {item.senderName}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">
                        +{item.amount.toFixed(2)}€
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Stripe Connect Setup - En fin de page */}
      <StripeConnectSetup />
    </div>
  );
};

export default DashboardPaymentsSection;
