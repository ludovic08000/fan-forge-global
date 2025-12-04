/**
 * Page Dashboard - Interface principale pour créateurs et abonnés
 * Affiche les statistiques, le contenu et les paramètres selon le rôle
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Crown, BarChart3, Heart, Eye, Euro, Settings, Plus, Video, Upload, Trash2, Share2, Copy, Banknote, Shield } from 'lucide-react';
import ContentUpload from '@/components/ContentUpload';
import { OptimizedContentGallery } from '@/components/OptimizedContentGallery';
import CreatorSettings from '@/components/CreatorSettings';
import CreatorBoost from '@/components/CreatorBoost';
import CreatorAnalyticsDashboard from '@/components/analytics/CreatorAnalyticsDashboard';
import { LiveStreamStudio } from '@/components/LiveStreamStudio';
import PaymentRequest from '@/components/creator/PaymentRequest';
import StripeConnectSetup from '@/components/creator/StripeConnectSetup';
import SubscriptionPricing from '@/components/creator/SubscriptionPricing';
import { useContent } from '@/hooks/useContent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAnalytics } from '@/lib/analytics';
import { useNavigate } from 'react-router-dom';

/**
 * Composant principal du Dashboard
 */
const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const { useMyContent } = useContent();
  const { trackPageView } = useAnalytics();
  const navigate = useNavigate();
  const { data: myContent, isLoading: contentLoading, refetch } = useMyContent();
  const [showUpload, setShowUpload] = useState(false);
  const [creatorStats, setCreatorStats] = useState({
    totalEarnings: 0,
    totalSubscribers: 0,
    totalViews: 0,
    totalLikes: 0
  });
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [isCreatorLocal, setIsCreatorLocal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    active: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
  } | null>(null);
  const [tabsValue, setTabsValue] = useState<string>((userRole === 'creator' || userRole === 'admin' || isCreatorLocal) ? 'my-content' : 'explore');

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) return;
    
    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId);
      
      if (error) throw error;
      
      toast.success('Contenu supprimé avec succès');
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
      toast.success('Lien copié dans le presse-papier !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Tracker la vue de page
  useEffect(() => {
    trackPageView('dashboard');
  }, [trackPageView]);

  // Charger le profil utilisateur pour le lien de partage
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
          const link = `${window.location.origin}/${profileData.username}`;
          setShareLink(link);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadUserProfile();
  }, [user]);

  useEffect(() => {
    const loadCreatorStats = async () => {
      if (!user) return;

      try {
        // Récupérer les stats du créateur (si une ligne existe)
        const { data: creatorData } = await supabase
          .from('creators')
          .select('id, total_earnings, total_subscribers, total_content, featured_until, stripe_account_status, stripe_charges_enabled, stripe_payouts_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (creatorData) {
          setIsCreatorLocal(true);
          setCreatorProfile(creatorData);
          
          // Mettre à jour le statut Stripe
          setStripeStatus({
            connected: creatorData.stripe_account_status === 'active',
            active: creatorData.stripe_account_status === 'active',
            charges_enabled: creatorData.stripe_charges_enabled || false,
            payouts_enabled: creatorData.stripe_payouts_enabled || false,
          });
          
          // Calculer les vues et likes totaux
          const totalViews = myContent?.reduce((sum, content) => sum + content.view_count, 0) || 0;
          const totalLikes = myContent?.reduce((sum, content) => sum + content.like_count, 0) || 0;

          setCreatorStats({
            totalEarnings: creatorData.total_earnings || 0,
            totalSubscribers: creatorData.total_subscribers || 0,
            totalViews,
            totalLikes
          });
        } else {
          setIsCreatorLocal(false);
        }
      } catch (error) {
        console.error('Error loading creator stats:', error);
      }
    };

    loadCreatorStats();
  }, [user, userRole, myContent]);

  // Gérer les redirections après paiement et Stripe Connect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Gérer le succès du boost
    if (urlParams.get('boost_success') === 'true') {
      toast.success('Boost activé avec succès! Votre profil est maintenant en vedette.');
      // Recharger les données du créateur
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('boost_canceled') === 'true') {
      toast.error('Achat de boost annulé.');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Gérer le retour d'onboarding Stripe Connect
    if (urlParams.get('stripe_connect') === 'success') {
      toast.success('Retour de Stripe détecté — vérification du statut...');
      supabase.functions.invoke('check-stripe-connect-status')
        .then(({ data, error }) => {
          if (error) {
            console.error('Erreur check-stripe-connect-status:', error);
            toast.error("Impossible de vérifier le statut Stripe");
          } else {
            if (data?.payouts_enabled) {
              toast.success('Stripe Connect activé — virements disponibles');
            } else {
              toast.info('Statut mis à jour — finalisez l\'onboarding si besoin');
            }
          }
        })
        .finally(() => {
          // Nettoyer l'URL puis recharger pour rafraîchir toutes les vues
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isCreator = isCreatorLocal || userRole === 'creator' || userRole === 'admin';

  // Rediriger les non-créateurs vers la page abonnements
  if (!loading && !isCreator) {
    return <Navigate to="/subscriptions" replace />;
  }

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xl">
                {user.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">
                Tableau de bord
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={isCreator ? "default" : "secondary"}>
                  {isCreator ? (
                    <>
                      <Crown className="h-3 w-3 mr-1" />
                      Créateur
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 mr-1" />
                      Abonné
                    </>
                  )}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isCreator && shareLink && (
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="gap-2"
              >
                {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Partager mon profil'}
              </Button>
            )}
            {isCreator && (
              <Button
                onClick={() => setShowUpload(!showUpload)}
                variant="premium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau contenu
              </Button>
            )}
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => navigate('/security')}
              title="Sécurité"
            >
              <Shield className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Creator Stats */}
        {isCreator && (
          <>
            {/* Statut Stripe Connect */}
            {stripeStatus && (
              <Card className={`mb-4 ${
                stripeStatus.active && stripeStatus.charges_enabled && stripeStatus.payouts_enabled
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-orange-500/50 bg-orange-500/5'
              }`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {stripeStatus.active && stripeStatus.charges_enabled && stripeStatus.payouts_enabled ? (
                      <>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
                          <Banknote className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-600">✅ Stripe Connect actif</p>
                          <p className="text-xs text-muted-foreground">Vous pouvez recevoir des paiements</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20">
                          <Banknote className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-orange-600">⚠️ Stripe Connect inactif</p>
                          <p className="text-xs text-muted-foreground">
                            {!stripeStatus.connected 
                              ? "Connectez votre compte pour recevoir des paiements"
                              : "Complétez la configuration dans l'onglet Paramètres"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTabsValue('settings')}
                  >
                    Configurer
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="flex items-center p-6">
                <Euro className="h-8 w-8 text-green-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('fr-FR', { 
                      style: 'currency', 
                      currency: 'EUR' 
                    }).format(creatorStats.totalEarnings)}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenus totaux</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <User className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{creatorStats.totalSubscribers}</p>
                  <p className="text-xs text-muted-foreground">Abonnés</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <Eye className="h-8 w-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{creatorStats.totalViews}</p>
                  <p className="text-xs text-muted-foreground">Vues totales</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <Heart className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">{creatorStats.totalLikes}</p>
                  <p className="text-xs text-muted-foreground">Likes totaux</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
        )}

        {/* Upload Component */}
        {isCreator && showUpload && (
          <div className="mb-8">
            <ContentUpload 
              onUploadComplete={() => {
                setShowUpload(false);
                refetch();
              }} 
            />
          </div>
        )}

        {/* Main Content */}
        <Tabs value={tabsValue} onValueChange={setTabsValue} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            {isCreator && <TabsTrigger value="my-content">Mon contenu</TabsTrigger>}
            {isCreator && (
              <TabsTrigger value="live" className="gap-1">
                <Video className="h-4 w-4" />
                Live
              </TabsTrigger>
            )}
            <TabsTrigger value="explore">Explorer</TabsTrigger>
            {isCreator && (
              <TabsTrigger value="payments" className="gap-1">
                <Banknote className="h-4 w-4" />
                Paiements
              </TabsTrigger>
            )}
            {isCreator && <TabsTrigger value="settings">Paramètres</TabsTrigger>}
            {isCreator && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          </TabsList>

          {/* My Content */}
          {isCreator && (
            <TabsContent value="my-content" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Mon contenu</h2>
                <Badge variant="outline">
                  {myContent?.length || 0} contenu{(myContent?.length || 0) > 1 ? 's' : ''}
                </Badge>
              </div>

              {contentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : myContent && myContent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {myContent.map((content) => (
                    <Card key={content.id} className="overflow-hidden group relative">
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={content.thumbnail_url || content.file_url}
                          alt={content.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium line-clamp-1 flex-1">{content.title}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteContent(content.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{content.view_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3" />
                              <span>{content.like_count}</span>
                            </div>
                          </div>
                          <Badge variant={content.is_premium ? "default" : "secondary"} className="text-xs">
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
                  <h3 className="text-lg font-medium mb-2">Aucun contenu pour le moment</h3>
                  <p className="text-muted-foreground mb-4">
                    Commencez à partager votre contenu avec votre audience
                  </p>
                  <Button onClick={() => setShowUpload(true)} variant="premium">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter du contenu
                  </Button>
                </div>
              )}
            </TabsContent>
          )}

          {/* Live Studio */}
          {isCreator && (
            <TabsContent value="live">
              <LiveStreamStudio />
            </TabsContent>
          )}

          {/* Explore */}
          <TabsContent value="explore" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Explorer le contenu</h2>
            </div>
            <OptimizedContentGallery />
          </TabsContent>

          {/* Settings */}
          {isCreator && (
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne gauche - Boost & Prix */}
                <div className="lg:col-span-1 space-y-6">
                  {creatorProfile?.id && (
                    <SubscriptionPricing creatorId={creatorProfile.id} />
                  )}
                  <CreatorBoost
                    currentBoostUntil={creatorProfile?.featured_until}
                    onBoostUpdate={() => {
                      // Recharger les données du créateur
                      setCreatorProfile(null);
                      window.location.reload();
                    }}
                  />
                  <StripeConnectSetup />
                </div>
                
                {/* Colonne droite - Paramètres */}
                <div className="lg:col-span-2">
                  <CreatorSettings />
                </div>
              </div>
            </TabsContent>
          )}

          {/* Payments */}
          {isCreator && (
            <TabsContent value="payments" className="space-y-6">
              <PaymentRequest />
            </TabsContent>
          )}

          {/* Analytics */}
          {isCreator && (
            <TabsContent value="analytics" className="space-y-6">
              <CreatorAnalyticsDashboard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;