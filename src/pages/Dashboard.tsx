/**
 * Page Dashboard - Interface simplifiée pour créateurs
 * Design intuitif avec sections claires
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, Heart, Eye, Euro, Settings, Plus, Video, Upload, 
  Trash2, Share2, Copy, Banknote, Shield, Loader2, MessageCircle,
  BarChart3, Users, ImageIcon, Radio, ChevronRight, ExternalLink,
  Tag, Sparkles, CreditCard, Wand2
} from 'lucide-react';
import ContentUpload from '@/components/ContentUpload';
import CreatorSettings from '@/components/CreatorSettings';
import CreatorBoost from '@/components/CreatorBoost';
import CreatorAnalyticsDashboard from '@/components/analytics/CreatorAnalyticsDashboard';
import PaymentRequest from '@/components/creator/PaymentRequest';
import StripeConnectSetup from '@/components/creator/StripeConnectSetup';
import SubscriptionPricing from '@/components/creator/SubscriptionPricing';
import ReferralCodesManager from '@/components/creator/ReferralCodesManager';
import CreatorInvoices from '@/components/creator/CreatorInvoices';
import { useContent } from '@/hooks/useContent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAnalytics } from '@/lib/analytics';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import CreatorMessages from '@/components/CreatorMessages';
import ImageLightbox from '@/components/ImageLightbox';
import PhotoEditor from '@/components/PhotoEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LiveStreamStudio = lazy(() => import('@/components/LiveStreamStudio').then(m => ({ default: m.LiveStreamStudio })));

const LiveStreamFallback = () => (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
    <Loader2 className="h-8 w-8 animate-spin mb-4" />
    <p>Chargement du studio live...</p>
  </div>
);

type DashboardSection = 'overview' | 'content' | 'live' | 'messages' | 'analytics' | 'pricing' | 'settings';

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const { useMyContent } = useContent();
  const { trackPageView } = useAnalytics();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { data: myContent, isLoading: contentLoading, refetch } = useMyContent();
  
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [creatorStats, setCreatorStats] = useState({
    totalEarnings: 0,
    totalSubscribers: 0,
    totalViews: 0,
    totalLikes: 0
  });
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [isCreatorLocal, setIsCreatorLocal] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Fonctions de navigation lightbox
  const handleOpenLightbox = (content: any, index: number) => {
    setSelectedContent(content);
    setLightboxIndex(index);
  };

  const handlePreviousImage = () => {
    if (myContent && lightboxIndex > 0) {
      const newIndex = lightboxIndex - 1;
      setLightboxIndex(newIndex);
      setSelectedContent(myContent[newIndex]);
    }
  };

  const handleNextImage = () => {
    if (myContent && lightboxIndex < myContent.length - 1) {
      const newIndex = lightboxIndex + 1;
      setLightboxIndex(newIndex);
      setSelectedContent(myContent[newIndex]);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) return;
    
    try {
      const { error } = await supabase.from('content').delete().eq('id', contentId);
      if (error) throw error;
      toast.success('Contenu supprimé');
      refetch();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    trackPageView('dashboard');
  }, [trackPageView]);

  useEffect(() => {
    const checkIfCreator = async () => {
      if (!user) {
        setIsCreatorLocal(false);
        return;
      }
      try {
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsCreatorLocal(!!creatorData);
      } catch (error) {
        console.error('Error checking creator status:', error);
        setIsCreatorLocal(false);
      }
    };
    checkIfCreator();
  }, [user]);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .single();
        if (profileData?.username) {
          setUserProfile(profileData);
          setShareLink(`${window.location.origin}/${profileData.username}`);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadUserProfile();
  }, [user]);

  // Charger les stats du créateur avec les vrais chiffres de la base
  const loadCreatorStats = async () => {
    if (!user || isCreatorLocal !== true) return;
    try {
      const { data: creatorData } = await supabase
        .from('creators')
        .select('id, total_earnings, total_subscribers, total_content, featured_until, stripe_account_status, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (creatorData) {
        setCreatorProfile(creatorData);
        setStripeConnected(creatorData.stripe_account_status === 'active' && creatorData.stripe_payouts_enabled);
        
        // Récupérer les vraies statistiques depuis la base de données
        const { data: contentStats } = await supabase
          .from('content')
          .select('id, view_count, like_count')
          .eq('creator_id', creatorData.id);

        const totalViews = contentStats?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0;
        const totalLikes = contentStats?.reduce((sum, content) => sum + (content.like_count || 0), 0) || 0;

        setCreatorStats({
          totalEarnings: creatorData.total_earnings || 0,
          totalSubscribers: creatorData.total_subscribers || 0,
          totalViews,
          totalLikes
        });
      }
    } catch (error) {
      console.error('Error loading creator stats:', error);
    }
  };

  useEffect(() => {
    loadCreatorStats();
  }, [user, isCreatorLocal]);

  // Temps réel pour les vues et likes
  useEffect(() => {
    if (!user || isCreatorLocal !== true || !creatorProfile?.id) return;

    // Subscription pour les nouvelles vues
    const viewsChannel = supabase
      .channel('realtime-views')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_views'
        },
        async (payload) => {
          // Vérifier si c'est pour le contenu du créateur
          const { data: content } = await supabase
            .from('content')
            .select('creator_id')
            .eq('id', payload.new.content_id)
            .single();
          
          if (content?.creator_id === creatorProfile.id) {
            setCreatorStats(prev => ({
              ...prev,
              totalViews: prev.totalViews + 1
            }));
          }
        }
      )
      .subscribe();

    // Subscription pour les likes
    const likesChannel = supabase
      .channel('realtime-likes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_likes'
        },
        async (payload) => {
          // Vérifier si c'est pour le contenu du créateur
          const { data: content } = await supabase
            .from('content')
            .select('creator_id')
            .eq('id', payload.new.content_id)
            .single();
          
          if (content?.creator_id === creatorProfile.id) {
            setCreatorStats(prev => ({
              ...prev,
              totalLikes: prev.totalLikes + 1
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'content_likes'
        },
        async (payload) => {
          // Vérifier si c'est pour le contenu du créateur (on utilise old pour DELETE)
          const { data: content } = await supabase
            .from('content')
            .select('creator_id')
            .eq('id', payload.old.content_id)
            .single();
          
          if (content?.creator_id === creatorProfile.id) {
            setCreatorStats(prev => ({
              ...prev,
              totalLikes: Math.max(0, prev.totalLikes - 1)
            }));
          }
        }
      )
      .subscribe();

    // Subscription pour les abonnés et revenus d'abonnement
    const subscribersChannel = supabase
      .channel('realtime-subscribers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `creator_id=eq.${creatorProfile.id}`
        },
        () => {
          // Recharger les stats pour avoir le bon compte
          loadCreatorStats();
        }
      )
      .subscribe();

    // Subscription pour les tips (pourboires) - revenus en temps réel
    const tipsChannel = supabase
      .channel('realtime-tips')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tips',
          filter: `creator_id=eq.${creatorProfile.id}`
        },
        (payload) => {
          const tipAmount = payload.new.amount || 0;
          setCreatorStats(prev => ({
            ...prev,
            totalEarnings: prev.totalEarnings + tipAmount
          }));
        }
      )
      .subscribe();

    // Subscription pour les paiements de contenu privé
    const privateContentChannel = supabase
      .channel('realtime-private-content')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_content_payments'
        },
        async (payload) => {
          // Vérifier si le paiement est complété et si c'est pour ce créateur
          if (payload.new.status === 'paid' && payload.old.status !== 'paid') {
            const { data: message } = await supabase
              .from('private_messages')
              .select('creator_id')
              .eq('id', payload.new.message_id)
              .single();
            
            if (message?.creator_id === creatorProfile.id) {
              setCreatorStats(prev => ({
                ...prev,
                totalEarnings: prev.totalEarnings + (payload.new.amount || 0)
              }));
            }
          }
        }
      )
      .subscribe();

    // Subscription pour les paiements de live
    const livePaymentsChannel = supabase
      .channel('realtime-live-payments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_stream_payments'
        },
        async (payload) => {
          if (payload.new.status === 'paid' && payload.old.status !== 'paid') {
            const { data: liveStream } = await supabase
              .from('live_streams')
              .select('creator_id')
              .eq('id', payload.new.live_stream_id)
              .single();
            
            if (liveStream?.creator_id === creatorProfile.id) {
              setCreatorStats(prev => ({
                ...prev,
                totalEarnings: prev.totalEarnings + (payload.new.amount || 0)
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(viewsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(subscribersChannel);
      supabase.removeChannel(tipsChannel);
      supabase.removeChannel(privateContentChannel);
      supabase.removeChannel(livePaymentsChannel);
    };
  }, [user, isCreatorLocal, creatorProfile?.id]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('boost_success') === 'true') {
      toast.success('Boost activé !');
      setTimeout(() => window.location.reload(), 2000);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('boost_canceled') === 'true') {
      toast.error('Achat de boost annulé.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlParams.get('stripe_connect') === 'success') {
      toast.success('Vérification Stripe en cours...');
      supabase.functions.invoke('check-stripe-connect-status')
        .then(({ data, error }) => {
          if (!error && data?.payouts_enabled) {
            toast.success('Stripe Connect activé !');
          }
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        });
    }
  }, []);

  if (loading || isCreatorLocal === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isCreator = isCreatorLocal === true || userRole === 'creator' || userRole === 'admin';

  if (!isCreator) {
    return <Navigate to="/subscriptions" replace />;
  }

  const menuItems = [
    { id: 'overview' as DashboardSection, label: 'Aperçu', icon: BarChart3, badge: 0 },
    { id: 'content' as DashboardSection, label: 'Mon contenu', icon: ImageIcon, badge: 0 },
    { id: 'live' as DashboardSection, label: 'Live', icon: Radio, badge: 0 },
    { id: 'messages' as DashboardSection, label: 'Messages', icon: MessageCircle, badge: unreadCount },
    { id: 'analytics' as DashboardSection, label: 'Statistiques', icon: BarChart3, badge: 0 },
    { id: 'pricing' as DashboardSection, label: 'Abonnement & Boost', icon: Sparkles, badge: 0 },
    { id: 'settings' as DashboardSection, label: 'Paramètres', icon: Settings, badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-16">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header premium */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl blur-xl" />
          <div className="relative flex items-center justify-between p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-lg">
                    {user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Mon espace créateur
                </h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {shareLink && (
                <Button onClick={handleCopyLink} variant="outline" size="sm" className="gap-2 rounded-xl">
                  {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  <span className="hidden sm:inline">{copied ? 'Copié !' : 'Partager'}</span>
                </Button>
              )}
              <Button onClick={() => setShowUpload(true)} size="sm" className="gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouveau contenu</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Alerte Stripe */}
        {!stripeConnected && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-600">Configurez vos paiements</p>
                <p className="text-xs text-muted-foreground">Connectez Stripe pour recevoir vos revenus</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveSection('settings')} className="rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
              Configurer
            </Button>
          </div>
        )}

        {/* Navigation élégante */}
        <div className="flex gap-1.5 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection(item.id)}
              className={`gap-2 whitespace-nowrap rounded-xl transition-all ${
                activeSection === item.id 
                  ? "shadow-lg shadow-primary/20" 
                  : "hover:bg-muted/60"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex items-center gap-1.5">
                {item.label}
                {item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 min-w-5 px-1.5 text-[10px] font-bold"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Badge>
                )}
              </span>
            </Button>
          ))}
        </div>

        {/* Upload Dialog */}
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter du contenu</DialogTitle>
              <DialogDescription>Partagez une nouvelle photo ou vidéo avec votre audience</DialogDescription>
            </DialogHeader>
            <ContentUpload 
              onUploadComplete={() => {
                setShowUpload(false);
                refetch();
              }} 
            />
          </DialogContent>
        </Dialog>

        {/* Section: Aperçu */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Stats avec design glassmorphism */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent p-5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <Euro className="h-7 w-7 text-emerald-500 mb-3" />
                <p className="text-3xl font-bold text-emerald-500">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(creatorStats.totalEarnings)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Revenus totaux</p>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-transparent p-5 border border-blue-500/20 hover:border-blue-500/40 transition-all hover:shadow-xl hover:shadow-blue-500/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <Users className="h-7 w-7 text-blue-500 mb-3" />
                <p className="text-3xl font-bold text-blue-500">{creatorStats.totalSubscribers}</p>
                <p className="text-sm text-muted-foreground mt-1">Abonnés actifs</p>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-transparent p-5 border border-violet-500/20 hover:border-violet-500/40 transition-all hover:shadow-xl hover:shadow-violet-500/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <Eye className="h-7 w-7 text-violet-500 mb-3" />
                <p className="text-3xl font-bold text-violet-500">{creatorStats.totalViews}</p>
                <p className="text-sm text-muted-foreground mt-1">Vues totales</p>
              </div>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-transparent p-5 border border-rose-500/20 hover:border-rose-500/40 transition-all hover:shadow-xl hover:shadow-rose-500/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <Heart className="h-7 w-7 text-rose-500 mb-3" />
                <p className="text-3xl font-bold text-rose-500">{creatorStats.totalLikes}</p>
                <p className="text-sm text-muted-foreground mt-1">Likes reçus</p>
              </div>
            </div>

            {/* Actions rapides - Design moderne */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all"
                onClick={() => setShowUpload(true)}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Nouveau contenu</h3>
                <p className="text-xs text-muted-foreground">Photos & vidéos</p>
              </div>

              <div 
                className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-rose-500/30 hover:shadow-xl hover:shadow-rose-500/5 transition-all"
                onClick={() => setActiveSection('live')}
              >
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Radio className="h-6 w-6 text-rose-500" />
                </div>
                <h3 className="font-semibold mb-1">Lancer un Live</h3>
                <p className="text-xs text-muted-foreground">Streaming direct</p>
              </div>

              <div 
                className="group cursor-pointer p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
                onClick={() => setActiveSection('messages')}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-1">Messages</h3>
                <p className="text-xs text-muted-foreground">Discuter avec vos fans</p>
              </div>

              <div 
                className="group cursor-pointer p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all"
                onClick={() => setActiveSection('pricing')}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="font-semibold mb-1 text-amber-600 dark:text-amber-400">Booster</h3>
                <p className="text-xs text-muted-foreground">Visibilité premium</p>
              </div>
            </div>

            {/* Derniers contenus - Design premium */}
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <h3 className="font-semibold text-lg">Derniers contenus</h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveSection('content')} className="text-muted-foreground hover:text-foreground">
                  Voir tout →
                </Button>
              </div>
              <div className="p-5">
                {contentLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : myContent && myContent.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {myContent.slice(0, 4).map((content, index) => (
                      <div 
                        key={content.id} 
                        className="aspect-square rounded-xl overflow-hidden bg-muted relative group cursor-pointer ring-1 ring-border/50 hover:ring-primary/50 transition-all"
                        onClick={() => handleOpenLightbox(content, index)}
                      >
                        <img
                          src={content.thumbnail_url || content.file_url}
                          alt={content.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                          <div className="text-white text-xs flex items-center gap-3">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{content.view_count}</span>
                            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{content.like_count}</span>
                          </div>
                        </div>
                        {content.content_type === 'image' && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingContent(content);
                            }}
                          >
                            <Wand2 className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground mb-3">Aucun contenu encore</p>
                    <Button onClick={() => setShowUpload(true)} size="sm" className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter du contenu
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Paiements */}
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-2 p-5 border-b border-border/50">
                <Banknote className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-lg">Paiements</h3>
              </div>
              <div className="p-5">
                <PaymentRequest />
              </div>
            </div>
          </div>
        )}

        {/* Section: Mon contenu */}
        {activeSection === 'content' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mon contenu</h2>
              <Badge variant="outline">{myContent?.length || 0} contenu{(myContent?.length || 0) > 1 ? 's' : ''}</Badge>
            </div>

            {contentLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : myContent && myContent.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {myContent.map((content, index) => (
                  <Card key={content.id} className="overflow-hidden group">
                    <div 
                      className="aspect-square bg-muted overflow-hidden relative cursor-pointer"
                      onClick={() => handleOpenLightbox(content, index)}
                    >
                      <img
                        src={content.thumbnail_url || content.file_url}
                        alt={content.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {content.content_type === 'image' && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingContent(content);
                            }}
                          >
                            <Wand2 className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContent(content.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1">{content.title}</h3>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{content.view_count}</span>
                          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{content.like_count}</span>
                        </div>
                        <Badge variant={content.is_premium ? "default" : "secondary"} className="text-[10px]">
                          {content.is_premium ? 'Premium' : 'Gratuit'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Aucun contenu</h3>
                <p className="text-muted-foreground mb-4">Commencez à partager avec votre audience</p>
                <Button onClick={() => setShowUpload(true)} variant="premium">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter du contenu
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Section: Live */}
        {activeSection === 'live' && (
          <Suspense fallback={<LiveStreamFallback />}>
            <LiveStreamStudio />
          </Suspense>
        )}

        {/* Section: Messages */}
        {activeSection === 'messages' && <CreatorMessages />}

        {/* Section: Analytics */}
        {activeSection === 'analytics' && <CreatorAnalyticsDashboard />}

        {/* Section: Abonnement & Boost */}
        {activeSection === 'pricing' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Abonnement & Boost
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez votre prix d'abonnement, codes promo et boostez votre visibilité
              </p>
            </div>

            {/* Info TVA */}
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Euro className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-600">Tarifs affichés TTC</p>
                    <p className="text-xs text-muted-foreground">
                      Tous les prix incluent la TVA (20%). Vous recevez 85% du montant HT après commission plateforme (15%).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Factures */}
            {creatorProfile?.id && <CreatorInvoices creatorId={creatorProfile.id} />}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonne gauche - Prix & Promos */}
              <div className="space-y-6">
                {creatorProfile?.id && <SubscriptionPricing creatorId={creatorProfile.id} />}
                {creatorProfile?.id && <ReferralCodesManager creatorId={creatorProfile.id} />}
              </div>
              
              {/* Colonne droite - Boost */}
              <div className="space-y-6">
                <CreatorBoost
                  currentBoostUntil={creatorProfile?.featured_until}
                  onBoostUpdate={() => window.location.reload()}
                />
                
                {/* Résumé revenus */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Résumé de vos gains
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Prix abonnement TTC</span>
                      <span className="font-medium">
                        {creatorProfile?.subscription_price 
                          ? `${creatorProfile.subscription_price.toFixed(2)} €` 
                          : 'Non défini'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Commission plateforme</span>
                      <span className="font-medium text-orange-600">-15%</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-medium">Vous recevez par abonné</span>
                      <span className="font-bold text-green-600">
                        {creatorProfile?.subscription_price 
                          ? `${(creatorProfile.subscription_price * 0.85).toFixed(2)} €` 
                          : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Section: Paramètres */}
        {activeSection === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paramètres du compte
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez Stripe et vos informations de profil
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonne gauche - Stripe */}
              <div className="space-y-6">
                <StripeConnectSetup />
              </div>
              
              {/* Colonne droite - Profil */}
              <div className="space-y-6">
                <CreatorSettings />
              </div>
            </div>
          </div>
        )}

        {/* Lightbox plein écran */}
        {selectedContent && selectedContent.content_type === 'image' && (
          <ImageLightbox
            isOpen={!!selectedContent}
            onClose={() => setSelectedContent(null)}
            imageUrl={selectedContent.file_url}
            title={selectedContent.title}
            description={selectedContent.description}
            hasPrevious={lightboxIndex > 0}
            hasNext={myContent ? lightboxIndex < myContent.length - 1 : false}
            onPrevious={handlePreviousImage}
            onNext={handleNextImage}
          />
        )}

        {/* Lecteur vidéo plein écran */}
        {selectedContent && selectedContent.content_type === 'video' && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setSelectedContent(null)}
          >
            <button
              onClick={() => setSelectedContent(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <span className="text-white text-2xl">×</span>
            </button>
            <video
              src={selectedContent.file_url}
              controls
              autoPlay
              className="max-w-[95vw] max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Éditeur de photos */}
        <PhotoEditor
          isOpen={!!editingContent}
          onClose={() => setEditingContent(null)}
          imageUrl={editingContent?.file_url || ''}
          contentId={editingContent?.id}
          onServerSave={() => refetch()}
        />
      </div>
    </div>
  );
};

export default Dashboard;
