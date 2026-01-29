/**
 * Page "Mes Achats" - Historique des paiements utilisateur
 * Affiche tous les achats: abonnements, tips, contenus privés
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Receipt, 
  Heart, 
  Crown, 
  MessageCircle, 
  Radio,
  Calendar,
  ExternalLink,
  ArrowLeft,
  CreditCard
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';

interface PaymentItem {
  id: string;
  type: 'subscription' | 'tip' | 'private_content' | 'live';
  amount: number;
  currency: string;
  description: string;
  recipientName: string | null;
  recipientUsername: string | null;
  createdAt: string;
  status: string;
}

export default function MyPayments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Charger les abonnements
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['my-subscriptions-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id, price, currency, created_at, status,
          creators!inner(id, stage_name, user_id),
          profiles:creators(user_id)
        `)
        .eq('subscriber_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Charger les tips envoyés - SEULEMENT ceux avec stripe_payment_intent_id (réellement payés)
  const { data: tips, isLoading: tipsLoading } = useQuery({
    queryKey: ['my-tips-sent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tips')
        .select(`
          id, amount, currency, message, created_at, creator_id, stripe_payment_intent_id
        `)
        .eq('sender_id', user!.id)
        .not('stripe_payment_intent_id', 'is', null) // Seulement les tips réellement payés
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      
      // Récupérer les noms des créateurs séparément
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(t => t.creator_id))];
        const { data: creators } = await supabase
          .from('creators')
          .select('id, stage_name')
          .in('id', creatorIds);
        
        const creatorsMap = new Map(creators?.map(c => [c.id, c.stage_name]) || []);
        return data.map(t => ({
          ...t,
          creator_name: creatorsMap.get(t.creator_id) || 'Créateur'
        }));
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Charger les contenus privés achetés
  const { data: privatePayments, isLoading: privateLoading } = useQuery({
    queryKey: ['my-private-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('private_content_payments')
        .select(`
          id, amount, currency, created_at, status,
          private_messages!inner(creator_id, creators:creator_id(stage_name))
        `)
        .eq('subscriber_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Charger les paiements live (accès payants)
  const { data: livePayments, isLoading: liveLoading } = useQuery({
    queryKey: ['my-live-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_stream_payments')
        .select(`
          id, amount, currency, created_at, status,
          live_streams!inner(title, creators:creator_id(stage_name))
        `)
        .eq('subscriber_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Combiner tous les paiements
  const allPayments: PaymentItem[] = [
    ...(subscriptions?.map(s => ({
      id: s.id,
      type: 'subscription' as const,
      amount: s.price,
      currency: s.currency || 'EUR',
      description: 'Abonnement mensuel',
      recipientName: (s.creators as any)?.stage_name || 'Créateur',
      recipientUsername: null,
      createdAt: s.created_at,
      status: s.status,
    })) || []),
    ...(tips?.map(t => ({
      id: t.id,
      type: 'tip' as const,
      amount: t.amount,
      currency: t.currency || 'EUR',
      description: t.message || 'Tip envoyé',
      recipientName: (t as any).creator_name || 'Créateur',
      recipientUsername: null,
      createdAt: t.created_at,
      status: 'completed',
    })) || []),
    ...(privatePayments?.map(p => ({
      id: p.id,
      type: 'private_content' as const,
      amount: p.amount,
      currency: p.currency || 'EUR',
      description: 'Contenu privé débloqué',
      recipientName: (p.private_messages as any)?.creators?.stage_name || 'Créateur',
      recipientUsername: null,
      createdAt: p.created_at,
      status: p.status,
    })) || []),
    ...(livePayments?.map(p => ({
      id: p.id,
      type: 'live' as const,
      amount: p.amount,
      currency: p.currency || 'EUR',
      description: `Accès Live: ${(p.live_streams as any)?.title || 'Live'}`,
      recipientName: (p.live_streams as any)?.creators?.stage_name || 'Créateur',
      recipientUsername: null,
      createdAt: p.created_at,
      status: p.status,
    })) || []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calcul des totaux
  const totals = {
    subscriptions: subscriptions?.reduce((sum, s) => sum + (s.price || 0), 0) || 0,
    tips: tips?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
    privateContent: privatePayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    live: livePayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
  };
  const totalSpent = totals.subscriptions + totals.tips + totals.privateContent + totals.live;

  const isLoading = subsLoading || tipsLoading || privateLoading || liveLoading;

  const getTypeConfig = (type: PaymentItem['type']) => {
    const configs = {
      subscription: { icon: Crown, label: 'Abonnement', color: 'bg-primary text-primary-foreground' },
      tip: { icon: Heart, label: 'Tip', color: 'bg-pink-500 text-white' },
      private_content: { icon: MessageCircle, label: 'Contenu', color: 'bg-purple-500 text-white' },
      live: { icon: Radio, label: 'Live', color: 'bg-red-500 text-white' },
    };
    return configs[type];
  };

  const formatAmount = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Mes Achats
          </h1>
          <p className="text-muted-foreground text-sm">
            Historique de tous vos paiements
          </p>
        </div>
      </div>

      {/* Résumé des dépenses */}
      <Card className="mb-6 overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            Résumé des dépenses
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Crown className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Abonnements</p>
              <p className="font-bold">{formatAmount(totals.subscriptions)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Heart className="h-5 w-5 text-pink-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Tips</p>
              <p className="font-bold">{formatAmount(totals.tips)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <MessageCircle className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Contenus</p>
              <p className="font-bold">{formatAmount(totals.privateContent)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Radio className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Lives</p>
              <p className="font-bold">{formatAmount(totals.live)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">Total dépensé</p>
            <p className="text-2xl font-bold text-primary">{formatAmount(totalSpent)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Historique des paiements */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Historique des transactions
            <Badge variant="secondary" className="ml-auto font-mono text-xs">
              {allPayments.length} transactions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucun achat pour le moment</p>
              <Link to="/search">
                <Button variant="link" className="mt-2">
                  Découvrir des créateurs
                </Button>
              </Link>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-border">
                {allPayments.map((item) => {
                  const config = getTypeConfig(item.type);
                  const Icon = config.icon;
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full ${config.color} flex items-center justify-center`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.recipientName}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold">
                          -{formatAmount(item.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}