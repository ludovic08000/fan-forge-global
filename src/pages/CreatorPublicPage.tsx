import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Heart, Eye, Lock, Crown, Share2, CheckCircle2, MessageCircle, UserMinus } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { EmbeddedCheckout } from '@/components/EmbeddedCheckout';
import ModernPrivateChat from '@/components/ModernPrivateChat';
import SEOHead from '@/components/SEOHead';
import { ProtectedMedia } from '@/components/ProtectedMedia';
import { useContentProtection } from '@/hooks/useContentProtection';

const CreatorPublicPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [preloadedSecret, setPreloadedSecret] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingContent, setLikingContent] = useState<string | null>(null);
  const [heartAnimation, setHeartAnimation] = useState<string | null>(null);
  const [unsubscribing, setUnsubscribing] = useState(false);

  // Activer la protection anti-capture sur toute la page
  useContentProtection(true);

  // Liste des chemins réservés qui ne sont pas des usernames
  const RESERVED_PATHS = ['admin', 'backstage', 'dashboard', 'login', 'signup', 'auth', 'search', 'lives', 'live', 'install', 'terms', 'privacy', 'legal', 'cookies', 'security', 'profile', 'subscriptions', 'reset-password', 'suspended'];

  useEffect(() => {
    const loadCreator = async () => {
      if (!username) return;

      // Vérifier si c'est un chemin réservé
      if (RESERVED_PATHS.includes(username.toLowerCase())) {
        setLoading(false);
        return;
      }
      try {
        // Essayer d'abord de chercher par username via la vue publique
        let profileData = null;
        let profileError = null;

        // Vérifier si c'est un UUID (user_id) ou un username
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);

        if (isUUID) {
          // Chercher par user_id via la vue publique
          const result = await supabase
            .from('public_creator_profiles')
            .select('*')
            .eq('user_id', username)
            .single();
          profileData = result.data;
          profileError = result.error;
        } else {
          // Chercher par username via la vue publique
          const result = await supabase
            .from('public_creator_profiles')
            .select('*')
            .eq('username', username)
            .single();
          profileData = result.data;
          profileError = result.error;
        }

        if (profileError) throw profileError;
        setProfile(profileData);

        // Récupérer les infos créateur via la vue publique
        const { data: creatorData, error: creatorError } = await supabase
          .from('public_creators')
          .select('*')
          .eq('user_id', profileData.user_id)
          .single();

        if (creatorError) throw creatorError;
        setCreator(creatorData);

        // Récupérer le contenu public
        const { data: contentData } = await supabase
          .from('content')
          .select('*')
          .eq('creator_id', creatorData.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        setContent(contentData || []);

        // Vérifier si abonné et charger les likes de l'utilisateur
        if (user) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorData.id)
            .eq('status', 'active')
            .maybeSingle();

          setIsSubscribed(!!subData);

          // Charger les likes de l'utilisateur pour ce contenu
          if (contentData && contentData.length > 0) {
            const contentIds = contentData.map((c: any) => c.id);
            const { data: likesData } = await supabase
              .from('content_likes')
              .select('content_id')
              .eq('user_id', user.id)
              .in('content_id', contentIds);

            if (likesData) {
              setUserLikes(new Set(likesData.map((l: any) => l.content_id)));
            }
          }
        }
      } catch (error) {
        console.error('Error loading creator:', error);
        toast.error('Créateur introuvable');
      } finally {
        setLoading(false);
      }
    };

    loadCreator();
  }, [username, user]);

  // Précharger le checkout en arrière-plan pour l'utilisateur connecté non-abonné
  useEffect(() => {
    const preloadCheckout = async () => {
      if (!user || !creator || isSubscribed || creator.subscription_price <= 0) return;
      
      try {
        const { data } = await supabase.functions.invoke('create-creator-checkout', {
          body: { creatorId: creator.id },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });
        
        if (data?.clientSecret) {
          setPreloadedSecret(data.clientSecret);
        }
      } catch (error) {
        // Silencieux, le préchargement n'est qu'une optimisation
        console.debug('Preload checkout:', error);
      }
    };

    preloadCheckout();
  }, [user, creator, isSubscribed]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.info('Connectez-vous pour vous abonner');
      navigate('/login');
      return;
    }

    if (!creator) return;

    if (creator.subscription_price <= 0) {
      // Abonnement gratuit
      try {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            subscriber_id: user.id,
            creator_id: creator.id,
            price: 0,
            currency: creator.currency
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Vous êtes déjà abonné à ce créateur');
          } else {
            throw error;
          }
          return;
        }

        setIsSubscribed(true);
        toast.success('Abonnement gratuit créé avec succès !');
      } catch (error: any) {
        toast.error('Erreur lors de l\'abonnement : ' + error.message);
      }
    } else {
      // Abonnement payant - ouvrir le checkout embedded
      setShowCheckout(true);
    }
  };

  const handleUnsubscribe = async () => {
    if (!user || !creator) return;

    setUnsubscribing(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('subscriber_id', user.id)
        .eq('creator_id', creator.id)
        .eq('status', 'active');

      if (error) throw error;

      setIsSubscribed(false);
      toast.success('Désabonnement effectué');
    } catch (error: any) {
      console.error('Error unsubscribing:', error);
      toast.error('Erreur lors du désabonnement');
    } finally {
      setUnsubscribing(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
  };

  // Enregistrer une vue de contenu
  const recordContentView = async (contentId: string) => {
    try {
      // Vérifier si l'utilisateur a déjà vu ce contenu (éviter les doublons)
      const { error } = await supabase
        .from('content_views')
        .insert({ 
          content_id: contentId, 
          viewer_id: user?.id || null 
        });

      if (!error) {
        // Incrémenter le compteur de vues
        const currentContent = content.find(c => c.id === contentId);
        await supabase
          .from('content')
          .update({ view_count: (currentContent?.view_count || 0) + 1 })
          .eq('id', contentId);

        // Mettre à jour le contenu local
        setContent(prev => prev.map(c => 
          c.id === contentId ? { ...c, view_count: (c.view_count || 0) + 1 } : c
        ));
      }
    } catch (error) {
      console.debug('View already recorded or error:', error);
    }
  };

  // Ouvrir l'image et enregistrer une vue
  const handleOpenImage = (item: any) => {
    setSelectedImage(item);
    recordContentView(item.id);
  };

  const handleLikeContent = async (contentId: string, showAnimation = true) => {
    if (!user) {
      toast.info('Connectez-vous pour liker');
      navigate('/auth');
      return;
    }

    // Animation du cœur au double-clic (seulement si on ajoute un like)
    const isLiked = userLikes.has(contentId);
    if (showAnimation && !isLiked) {
      setHeartAnimation(contentId);
      setTimeout(() => setHeartAnimation(null), 800);
    }

    setLikingContent(contentId);

    try {
      if (isLiked) {
        // Retirer le like
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('content_id', contentId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Décrémenter le compteur
        await supabase
          .from('content')
          .update({ like_count: (content.find(c => c.id === contentId)?.like_count || 1) - 1 })
          .eq('id', contentId);

        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });

        // Mettre à jour le contenu local
        setContent(prev => prev.map(c => 
          c.id === contentId ? { ...c, like_count: Math.max(0, (c.like_count || 1) - 1) } : c
        ));
        if (selectedImage?.id === contentId) {
          setSelectedImage((prev: any) => prev ? { ...prev, like_count: Math.max(0, (prev.like_count || 1) - 1) } : null);
        }
      } else {
        // Ajouter le like
        const { error } = await supabase
          .from('content_likes')
          .insert({ content_id: contentId, user_id: user.id });

        if (error) {
          if (error.code === '23505') {
            // Already liked
            return;
          }
          throw error;
        }

        // Incrémenter le compteur
        await supabase
          .from('content')
          .update({ like_count: (content.find(c => c.id === contentId)?.like_count || 0) + 1 })
          .eq('id', contentId);

        setUserLikes(prev => new Set([...prev, contentId]));

        // Mettre à jour le contenu local
        setContent(prev => prev.map(c => 
          c.id === contentId ? { ...c, like_count: (c.like_count || 0) + 1 } : c
        ));
        if (selectedImage?.id === contentId) {
          setSelectedImage((prev: any) => prev ? { ...prev, like_count: (prev.like_count || 0) + 1 } : null);
        }

        toast.success('❤️ Liked !');
      }
    } catch (error: any) {
      console.error('Error liking content:', error);
      toast.error('Erreur lors du like');
    } finally {
      setLikingContent(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!creator || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Créateur introuvable</h1>
          <Link to="/">
            <Button>Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  const freeContent = content.filter(c => !c.is_premium);
  const premiumContent = content.filter(c => c.is_premium);

  const creatorName = creator?.stage_name || profile?.display_name || profile?.username || 'Créateur';
  const creatorDescription = profile?.bio 
    ? `${profile.bio.substring(0, 150)}${profile.bio.length > 150 ? '...' : ''}`
    : `Découvrez le profil de ${creatorName} sur Crub. ${creator?.category ? `Catégorie: ${creator.category}.` : ''} ${creator?.total_subscribers || 0} abonnés.`;
  const creatorImage = profile?.avatar_url || '/og-image.jpg';
  const creatorUrl = `https://crub.fr/creator/${profile?.username || username}`;

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* SEO Head avec JSON-LD */}
      <SEOHead
        title={`${creatorName} - Profil Créateur`}
        description={creatorDescription}
        image={creatorImage}
        url={creatorUrl}
        type="profile"
        keywords={`${creatorName}, créateur Crub, ${creator?.category || 'contenu exclusif'}, abonnement créateur`}
        creator={{
          name: creatorName,
          username: profile?.username || '',
          category: creator?.category,
          bio: profile?.bio,
          subscriberCount: creator?.total_subscribers || 0,
          contentCount: content.length,
          isVerified: profile?.is_verified,
          subscriptionPrice: creator?.subscription_price,
          currency: creator?.currency || 'EUR'
        }}
        modifiedTime={creator?.updated_at}
      />

      {/* Header avec cover */}
      <div className="relative h-64 bg-gradient-to-r from-primary/20 to-primary/10">
        {profile.cover_url && (
          <img 
            src={profile.cover_url} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10">
        {/* Profil */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-3xl">
                  {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">
                    {creator.stage_name || profile.display_name || profile.username}
                  </h1>
                  {profile.is_verified && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Vérifié
                    </Badge>
                  )}
                  {creator.is_featured && (
                    <Badge variant="default" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Featured
                    </Badge>
                  )}
                </div>
                
                <p className="text-muted-foreground mb-1">@{profile.username}</p>
                
                {creator.category && (
                  <Badge variant="outline" className="mb-3">{creator.category}</Badge>
                )}

                {profile.bio && (
                  <p className="text-sm mt-3 max-w-2xl">{profile.bio}</p>
                )}

                <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                  <span>{creator.total_subscribers} abonnés</span>
                  <span>{content.length} contenus</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {user ? (
                  isSubscribed ? (
                    <div className="flex flex-col gap-2">
                      <Badge variant="default" className="text-base px-4 py-2">
                        <Crown className="h-4 w-4 mr-2" />
                        Abonné
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <UserMinus className="h-4 w-4 mr-2" />
                            Se désabonner
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer le désabonnement</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir vous désabonner de {creator.stage_name || profile.display_name || profile.username} ? 
                              Vous perdrez l'accès au contenu premium.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleUnsubscribe}
                              disabled={unsubscribing}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {unsubscribing ? 'Désabonnement...' : 'Se désabonner'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <Button size="lg" variant="premium" onClick={handleSubscribe}>
                      <Crown className="h-4 w-4 mr-2" />
                      {creator.subscription_price > 0 ? `S'abonner - ${creator.subscription_price}€/mois` : "S'abonner gratuitement"}
                    </Button>
                  )
                ) : (
                  <Link to="/auth">
                    <Button size="lg" variant="premium">
                      <Crown className="h-4 w-4 mr-2" />
                      S'abonner - {creator.subscription_price}€/mois
                    </Button>
                  </Link>
                )}
                
                {isSubscribed && (
                  <Button variant="outline" onClick={() => navigate(`/chat/${creator.id}`)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message privé
                  </Button>
                )}
                
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {copied ? 'Copié !' : 'Partager'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenu gratuit */}
        {freeContent.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Contenu gratuit</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {freeContent.map((item) => (
                <ProtectedMedia
                  key={item.id}
                  className="overflow-hidden group cursor-pointer rounded-lg border bg-card"
                  watermarkText={creator?.stage_name || profile?.username}
                >
                  <div 
                    className="aspect-square bg-muted relative overflow-hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenImage(item);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleLikeContent(item.id);
                    }}
                  >
                    <OptimizedImage
                      src={item.thumbnail_url || item.file_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    
                    {/* Animation cœur Instagram */}
                    {heartAnimation === item.id && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                        <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pointer-events-none z-30">
                      <h3 className="text-white font-medium text-sm line-clamp-1">{item.title}</h3>
                      <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {item.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {item.like_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </ProtectedMedia>
              ))}
            </div>
          </div>
        )}

        {/* Contenu premium */}
        {premiumContent.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Crown className="h-6 w-6 text-primary" />
              Contenu Premium ({premiumContent.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {premiumContent.map((item) => (
                <ProtectedMedia
                  key={item.id}
                  className={`overflow-hidden relative rounded-lg border bg-card ${isSubscribed ? 'cursor-pointer group' : ''}`}
                  watermarkText={isSubscribed ? (creator?.stage_name || profile?.username) : undefined}
                  enableForensicWatermark={isSubscribed}
                  forensicOpacity={0.04}
                >
                  <div 
                    className="aspect-square bg-muted relative overflow-hidden"
                    onClick={(e) => {
                      if (isSubscribed) {
                        e.stopPropagation();
                        handleOpenImage(item);
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (isSubscribed) {
                        e.stopPropagation();
                        handleLikeContent(item.id);
                      }
                    }}
                  >
                    <OptimizedImage
                      src={item.thumbnail_url || item.file_url}
                      alt={item.title}
                      className={`w-full h-full object-cover ${!isSubscribed ? 'blur-lg' : 'group-hover:scale-105 transition-transform'}`}
                    />
                    
                    {/* Animation cœur Instagram */}
                    {heartAnimation === item.id && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                        <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
                      </div>
                    )}
                    
                    {!isSubscribed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none z-30">
                        <div className="text-center text-white">
                          <Lock className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">Contenu Premium</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pointer-events-none z-30">
                      <h3 className="text-white font-medium text-sm line-clamp-1">{item.title}</h3>
                      {isSubscribed && (
                        <div className="flex items-center gap-3 text-white/80 text-xs mt-1">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {item.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {item.like_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </ProtectedMedia>
              ))}
            </div>
            
            {!isSubscribed && (
              <div className="mt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Abonnez-vous pour débloquer {premiumContent.length} contenus premium
                </p>
                <Button size="lg" variant="premium" onClick={handleSubscribe}>
                  <Crown className="h-4 w-4 mr-2" />
                  S'abonner maintenant - {creator.subscription_price}€/mois
                </Button>
              </div>
            )}
          </div>
        )}

        {content.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Ce créateur n'a pas encore publié de contenu</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checkout Embedded Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="checkout-description">
          <DialogHeader>
            <DialogTitle>
              Abonnement à {creator?.stage_name || 'ce créateur'}
            </DialogTitle>
            <p id="checkout-description" className="text-sm text-muted-foreground">
              Complétez votre paiement pour accéder au contenu premium
            </p>
          </DialogHeader>
          {creator && <EmbeddedCheckout creatorId={creator.id} onClose={() => setShowCheckout(false)} preloadedSecret={preloadedSecret} />}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox personnalisé avec bouton like */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          {/* Bouton fermer */}
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-[10000] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <span className="sr-only">Fermer</span>
            ✕
          </button>
          
          {/* Container principal - empêche la propagation du clic */}
          <div 
            className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image - Double-clic pour liker */}
            <div className="relative">
              <OptimizedImage
                src={selectedImage.thumbnail_url || selectedImage.file_url}
                alt={selectedImage.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg cursor-pointer"
                onDoubleClick={() => handleLikeContent(selectedImage.id)}
              />
              
              {/* Animation cœur Instagram dans le lightbox */}
              {heartAnimation === selectedImage.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="h-32 w-32 text-red-500 fill-red-500 animate-heart-burst drop-shadow-2xl" />
                </div>
              )}
            </div>
            
            {/* Infos et bouton like */}
            <div className="w-full mt-4 px-4">
              <h3 className="text-white text-xl font-bold mb-2">{selectedImage.title}</h3>
              {selectedImage.description && (
                <p className="text-white/80 text-sm mb-3">{selectedImage.description}</p>
              )}
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-white/70 text-sm">
                  <Eye className="h-4 w-4" />
                  {selectedImage.view_count || 0} vues
                </span>
                <button
                  type="button"
                  onClick={() => {
                    console.log('Like button clicked!', selectedImage.id);
                    handleLikeContent(selectedImage.id);
                  }}
                  disabled={likingContent === selectedImage.id}
                  className={`flex items-center gap-2 text-sm transition-all px-4 py-2 rounded-lg border ${
                    userLikes.has(selectedImage.id)
                      ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/10 border-white/30 text-white/70 hover:bg-white/20 hover:text-red-400'
                  }`}
                >
                  <Heart 
                    className={`h-5 w-5 transition-transform ${
                      userLikes.has(selectedImage.id) ? 'fill-current scale-110' : ''
                    } ${likingContent === selectedImage.id ? 'animate-pulse' : ''}`} 
                  />
                  {selectedImage.like_count || 0} likes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Private Chat Dialog */}
      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Message privé avec {creator?.stage_name || profile?.display_name}</DialogTitle>
          </DialogHeader>
          {creator && (
            <ModernPrivateChat 
              creatorId={creator.id}
              creatorName={creator.stage_name || profile?.display_name || profile?.username || 'Créateur'}
              creatorAvatar={profile?.avatar_url}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorPublicPage;
