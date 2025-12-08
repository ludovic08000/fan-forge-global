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
  Tag, Sparkles, CreditCard
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
import CreatorMessages from '@/components/CreatorMessages';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const { data: myContent, isLoading: contentLoading, refetch } = useMyContent();
  
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [showUpload, setShowUpload] = useState(false);
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

  useEffect(() => {
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
          
          const totalViews = myContent?.reduce((sum, content) => sum + content.view_count, 0) || 0;
          const totalLikes = myContent?.reduce((sum, content) => sum + content.like_count, 0) || 0;

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
    loadCreatorStats();
  }, [user, isCreatorLocal, myContent]);

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
    { id: 'overview' as DashboardSection, label: 'Aperçu', icon: BarChart3 },
    { id: 'content' as DashboardSection, label: 'Mon contenu', icon: ImageIcon },
    { id: 'live' as DashboardSection, label: 'Live', icon: Radio },
    { id: 'messages' as DashboardSection, label: 'Messages', icon: MessageCircle },
    { id: 'analytics' as DashboardSection, label: 'Statistiques', icon: BarChart3 },
    { id: 'pricing' as DashboardSection, label: 'Tarification', icon: Tag },
    { id: 'settings' as DashboardSection, label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="container mx-auto px-4 py-6">
        
        {/* Header compact */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">Mon espace créateur</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shareLink && (
              <Button onClick={handleCopyLink} variant="outline" size="sm" className="gap-2">
                {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? 'Copié !' : 'Partager'}</span>
              </Button>
            )}
            <Button onClick={() => setShowUpload(true)} variant="premium" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </Button>
          </div>
        </div>

        {/* Alerte Stripe si non connecté */}
        {!stripeConnected && (
          <Card className="mb-6 border-orange-500/50 bg-orange-500/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
                  <Banknote className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-orange-600">Configurez vos paiements</p>
                  <p className="text-xs text-muted-foreground">Connectez Stripe pour recevoir vos revenus</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveSection('settings')}>
                Configurer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation simplifiée */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection(item.id)}
              className="gap-2 whitespace-nowrap"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
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
          <div className="space-y-6">
            {/* Stats rapides */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Euro className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(creatorStats.totalEarnings)}
                      </p>
                      <p className="text-xs text-muted-foreground">Revenus</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{creatorStats.totalSubscribers}</p>
                      <p className="text-xs text-muted-foreground">Abonnés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Eye className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{creatorStats.totalViews}</p>
                      <p className="text-xs text-muted-foreground">Vues</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">{creatorStats.totalLikes}</p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setShowUpload(true)}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Ajouter du contenu</h3>
                    <p className="text-sm text-muted-foreground">Photos ou vidéos</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setActiveSection('live')}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-500/10">
                    <Radio className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Lancer un Live</h3>
                    <p className="text-sm text-muted-foreground">Streaming en direct</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setActiveSection('messages')}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Messages</h3>
                    <p className="text-sm text-muted-foreground">Discuter avec vos fans</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>

            {/* Derniers contenus */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Derniers contenus</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveSection('content')}>
                  Voir tout
                </Button>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : myContent && myContent.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {myContent.slice(0, 4).map((content) => (
                      <div key={content.id} className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                        <img
                          src={content.thumbnail_url || content.file_url}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-white text-center text-xs">
                            <div className="flex items-center gap-2 justify-center">
                              <Eye className="h-3 w-3" /> {content.view_count}
                              <Heart className="h-3 w-3 ml-2" /> {content.like_count}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun contenu</p>
                    <Button variant="link" size="sm" onClick={() => setShowUpload(true)}>
                      Ajouter votre premier contenu
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demande de paiement rapide */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  Paiements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentRequest />
              </CardContent>
            </Card>
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
                {myContent.map((content) => (
                  <Card key={content.id} className="overflow-hidden group">
                    <div className="aspect-square bg-muted overflow-hidden relative">
                      <img
                        src={content.thumbnail_url || content.file_url}
                        alt={content.title}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteContent(content.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

        {/* Section: Tarification */}
        {activeSection === 'pricing' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tarification & Monétisation
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos prix, codes promo et boostez votre visibilité
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
      </div>
    </div>
  );
};

export default Dashboard;
