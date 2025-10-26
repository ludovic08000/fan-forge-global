import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Heart, Eye, Lock, Crown, Share2, CheckCircle2 } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';

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

  useEffect(() => {
    const loadCreator = async () => {
      if (!username) return;

      try {
        // Essayer d'abord de chercher par username
        let profileData = null;
        let profileError = null;

        // Vérifier si c'est un UUID (user_id) ou un username
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);

        if (isUUID) {
          // Chercher par user_id
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', username)
            .single();
          profileData = result.data;
          profileError = result.error;
        } else {
          // Chercher par username
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();
          profileData = result.data;
          profileError = result.error;
        }

        if (profileError) throw profileError;
        setProfile(profileData);

        // Récupérer les infos créateur
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
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

        // Vérifier si abonné
        if (user) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorData.id)
            .eq('status', 'active')
            .maybeSingle();

          setIsSubscribed(!!subData);
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

  const handleSubscribe = async () => {
    if (!user) {
      toast.info('Connectez-vous pour vous abonner');
      navigate('/auth');
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

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Lien copié !');
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className="min-h-screen bg-background pt-16">
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
                    <Badge variant="default" className="text-base px-4 py-2">
                      <Crown className="h-4 w-4 mr-2" />
                      Abonné
                    </Badge>
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
                <Card key={item.id} className="overflow-hidden group cursor-pointer">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <OptimizedImage
                      src={item.thumbnail_url || item.file_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
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
                </Card>
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
                <Card key={item.id} className="overflow-hidden relative">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <OptimizedImage
                      src={item.thumbnail_url || item.file_url}
                      alt={item.title}
                      className={`w-full h-full object-cover ${!isSubscribed ? 'blur-lg' : ''}`}
                    />
                    {!isSubscribed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="text-center text-white">
                          <Lock className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">Contenu Premium</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
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
                </Card>
              ))}
            </div>
            
            {!isSubscribed && (
              <div className="mt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Abonnez-vous pour débloquer {premiumContent.length} contenus premium
                </p>
                <Button size="lg" variant="premium">
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
    </div>
  );
};

export default CreatorPublicPage;
