import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Crown, Settings, Upload, BarChart3, Heart, Eye, Euro, Plus } from 'lucide-react';
import ContentUpload from '@/components/ContentUpload';
import ContentGallery from '@/components/ContentGallery';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import SubscriptionStatus from '@/components/SubscriptionStatus';
import CreatorSettings from '@/components/CreatorSettings';
import { useContent } from '@/hooks/useContent';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user, userRole, loading } = useAuth();
  const { useMyContent } = useContent();
  const { refreshSubscription } = useSubscription();
  const { data: myContent, isLoading: contentLoading, refetch } = useMyContent();
  const [showUpload, setShowUpload] = useState(false);
  const [creatorStats, setCreatorStats] = useState({
    totalEarnings: 0,
    totalSubscribers: 0,
    totalViews: 0,
    totalLikes: 0
  });

  useEffect(() => {
    const loadCreatorStats = async () => {
      if (!user || userRole !== 'creator') return;

      try {
        // Récupérer les stats du créateur
        const { data: creatorData } = await supabase
          .from('creators')
          .select('total_earnings, total_subscribers, total_content')
          .eq('user_id', user.id)
          .single();

        if (creatorData) {
          // Calculer les vues et likes totaux
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
  }, [user, userRole, myContent]);

  // Rafraîchir le statut d'abonnement après un paiement réussi
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      refreshSubscription();
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshSubscription]);

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

  const isCreator = userRole === 'creator' || userRole === 'admin';

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
            {isCreator && (
              <Button
                onClick={() => setShowUpload(!showUpload)}
                variant="premium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau contenu
              </Button>
            )}
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Creator Stats */}
        {isCreator && (
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
        <Tabs defaultValue={isCreator ? "my-content" : "explore"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            {isCreator && <TabsTrigger value="my-content">Mon contenu</TabsTrigger>}
            <TabsTrigger value="explore">Explorer</TabsTrigger>
            <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
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
                    <Card key={content.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img
                          src={content.thumbnail_url || content.file_url}
                          alt={content.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-1">{content.title}</h3>
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

          {/* Explore */}
          <TabsContent value="explore" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Explorer le contenu</h2>
            </div>
            <ContentGallery />
          </TabsContent>

          {/* Subscriptions */}
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Abonnements</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne gauche - Statut */}
              <div className="lg:col-span-1">
                <SubscriptionStatus />
              </div>
              
              {/* Colonne droite - Plans */}
              <div className="lg:col-span-2">
                <SubscriptionPlans />
              </div>
            </div>
          </TabsContent>

          {/* Settings */}
          {isCreator && (
            <TabsContent value="settings" className="space-y-6">
              <CreatorSettings />
            </TabsContent>
          )}

          {/* Analytics */}
          {isCreator && (
            <TabsContent value="analytics" className="space-y-6">
              <h2 className="text-2xl font-semibold">Analytics</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">Statistiques détaillées en cours de développement...</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;