import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, 
  MapPin, 
  Globe, 
  Calendar, 
  Users, 
  Heart, 
  Eye, 
  ArrowLeft,
  Star,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useContent } from '@/hooks/useContent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ContentCard from '@/components/ContentCard';
import ModernPrivateChat from '@/components/ModernPrivateChat';
import { OptimizedContentGallery } from '@/components/OptimizedContentGallery';
import { ProfileAuctionsSection } from '@/components/auction/ProfileAuctionsSection';
import { ProfileBundlesSection } from '@/components/bundle/ProfileBundlesSection';
// import AgeVerificationGate, { requiresAgeVerification } from '@/components/AgeVerificationGate';
import { useGeoLocation } from '@/hooks/useGeoLocation';

interface Creator {
  id: string;
  user_id: string;
  stage_name: string | null;
  category: string | null;
  subscription_price: number;
  currency: string;
  is_accepting_tips: boolean;
  is_featured: boolean;
  total_earnings: number;
  total_subscribers: number;
  total_content: number;
  subscription_active: boolean;
  plan_type: string;
  created_at: string;
  hide_subscriber_count: boolean | null;
  blocked_countries: string[] | null;
  profiles: {
    username: string | null;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    location: string | null;
    website: string | null;
    is_verified: boolean;
  } | null;
}

const CreatorProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { geoData } = useGeoLocation();
  const { useCreatorContent } = useContent();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isGeoBlocked, setIsGeoBlocked] = useState(false);

  // Charger le profil du créateur
  useEffect(() => {
    const loadCreator = async () => {
      if (!userId) return;

      try {
        // Charger le créateur par user_id (sans relation embarquée pour éviter l'erreur PostgREST)
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (creatorError || !creatorData) {
          console.error('Error loading creator:', creatorError);
          navigate('/404');
          return;
        }

        // Charger le profil associé via la vue publique (sans données sensibles)
        const { data: profileData } = await supabase
          .from('public_creator_profiles')
          .select('username, display_name, bio, avatar_url, cover_url, location, website, is_verified')
          .eq('user_id', userId)
          .maybeSingle();

        const combined = { ...creatorData, profiles: profileData || null } as any;
        setCreator(combined);

        // Geo-blocking check
        if (creatorData.blocked_countries && creatorData.blocked_countries.length > 0) {
          if (creatorData.blocked_countries.includes(geoData.countryCode)) {
            setIsGeoBlocked(true);
            setLoading(false);
            return;
          }
        }

        // Vérifier si l'utilisateur suit ce créateur
        if (user) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('creator_id', creatorData.id)
            .single();

          setIsFollowing(!!followData);

          // Vérifier si l'utilisateur est abonné
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorData.id)
            .eq('status', 'active')
            .single();

          setIsSubscribed(!!subData);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCreator();
  }, [userId, user, navigate]);

  const { data: creatorContent, isLoading: contentLoading } = useCreatorContent(creator?.id || '');

  const handleFollow = async () => {
    if (!user || !creator) {
      toast.info('Connectez-vous pour suivre ce créateur');
      navigate('/login');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('creator_id', creator.id);
        
        setIsFollowing(false);
        toast.success('Vous ne suivez plus ce créateur');
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            creator_id: creator.id
          });
        
        setIsFollowing(true);
        toast.success('Vous suivez maintenant ce créateur');
      }
    } catch (error: any) {
      toast.error('Erreur : ' + error.message);
    }
  };

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
      // Abonnement payant - rediriger vers Stripe
      try {
        const { data, error } = await supabase.functions.invoke('create-creator-checkout', {
          body: { creatorId: creator.id },
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (error) throw error;

        if (data.url) {
          window.open(data.url, '_blank');
        }
      } catch (error: any) {
        console.error('Checkout error:', error);
        toast.error('Erreur lors de la création du checkout : ' + error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isGeoBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Contenu non disponible</h1>
          <p className="text-muted-foreground">
            Ce profil n'est pas accessible depuis votre région.
          </p>
          <Link to="/">
            <Button className="mt-4">Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Créateur non trouvé</h1>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: creator.currency.toUpperCase()
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  };

  const creatorName = creator.stage_name || creator.profiles?.display_name || creator.profiles?.username || 'Créateur';
  const creatorInitials = creatorName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Cover Section */}
      <div className="relative h-64 bg-gradient-to-br from-primary/20 to-primary-glow/20 overflow-hidden">
        {creator.profiles?.cover_url && (
          <img
            src={creator.profiles.cover_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 bg-black/50 text-white hover:bg-black/70"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Avatar & Info */}
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="relative inline-block mb-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={creator.profiles?.avatar_url || ''} />
                      <AvatarFallback className="text-2xl">{creatorInitials}</AvatarFallback>
                    </Avatar>
                    {creator.profiles?.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                        <Crown className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  <h1 className="text-2xl font-bold mb-2">{creatorName}</h1>
                  
                  {creator.profiles?.bio && (
                    <p className="text-muted-foreground text-sm mb-4">
                      {creator.profiles.bio}
                    </p>
                  )}

                  {/* Creator Info */}
                  <div className="space-y-2 text-sm text-muted-foreground mb-6">
                    {creator.category && (
                      <div className="flex items-center justify-center space-x-2">
                        <Star className="h-4 w-4" />
                        <span>{creator.category}</span>
                      </div>
                    )}
                    
                    {creator.profiles?.location && (
                      <div className="flex items-center justify-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{creator.profiles.location}</span>
                      </div>
                    )}
                    
                    {creator.profiles?.website && (
                      <div className="flex items-center justify-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <a 
                          href={creator.profiles.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-primary"
                        >
                          Site web
                        </a>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Créateur depuis {formatDate(creator.created_at)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                    <div>
                      <div className="text-xl font-bold">
                        {creator.hide_subscriber_count ? '—' : creator.total_subscribers}
                      </div>
                      <div className="text-xs text-muted-foreground">Abonnés</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold">{creator.total_content}</div>
                      <div className="text-xs text-muted-foreground">Contenus</div>
                    </div>
                  </div>

                  {user && isSubscribed && (
                    <div className="space-y-2 mb-4">
                      <p className="text-green-600 font-medium">✓ Vous êtes abonné(e)</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {creator.subscription_price > 0 ? (
                      <Button
                        variant={isSubscribed ? "outline" : "premium"}
                        className="w-full"
                        onClick={handleSubscribe}
                        disabled={isSubscribed}
                      >
                        {isSubscribed ? (
                          <>
                            <Crown className="h-4 w-4 mr-2" />
                            Abonné
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            S'abonner • {formatPrice(creator.subscription_price)}/mois
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Abonnement gratuit
                      </Button>
                    )}

                    <Button
                      variant={isFollowing ? "secondary" : "outline"}
                      className="w-full"
                      onClick={handleFollow}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? 'Suivi' : 'Suivre'}
                    </Button>

                    {user && isSubscribed && (
                      <Button
                        onClick={() => setShowChat(!showChat)}
                        variant="outline"
                        className="w-full"
                      >
                        {showChat ? 'Masquer le chat' : 'Chat privé'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Info */}
              {creator.subscription_price > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Abonnement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Prix mensuel</span>
                      <span className="font-semibold">{formatPrice(creator.subscription_price)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Accès à tout le contenu premium de ce créateur
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="posts">Publications</TabsTrigger>
                <TabsTrigger value="about">À propos</TabsTrigger>
                <TabsTrigger value="media">Médias</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-6">
                <ProfileBundlesSection creatorId={creator.id} />
                <ProfileAuctionsSection creatorId={creator.id} />
                <OptimizedContentGallery creatorId={creator.id} />
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>À propos de {creatorName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {creator.profiles?.bio ? (
                      <p>{creator.profiles.bio}</p>
                    ) : (
                      <p className="text-muted-foreground">Aucune biographie disponible.</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{creator.total_content}</div>
                        <div className="text-sm text-muted-foreground">Publications</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">
                          {creator.hide_subscriber_count ? '—' : creator.total_subscribers}
                        </div>
                        <div className="text-sm text-muted-foreground">Abonnés</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="space-y-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Galerie média en cours de développement</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Chat privé pour les abonnés */}
        {user && isSubscribed && showChat && creator && (
          <div className="mt-8">
            <ModernPrivateChat
              creatorId={creator.id}
              creatorName={creator.stage_name || 'Créateur'}
              creatorAvatar="/placeholder.svg"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorProfile;