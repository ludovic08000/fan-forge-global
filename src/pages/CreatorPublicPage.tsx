import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Heart, Eye, Lock, Crown, CheckCircle2, MessageCircle, UserMinus, Play, Image, Video, Home, Grid3X3, ShoppingBag, SlidersHorizontal, ChevronDown, ChevronUp, Coins, Instagram, Youtube, ExternalLink, User, LogOut, Settings, Menu, Calendar, Radio, ShieldAlert } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { EmbeddedCheckout } from '@/components/EmbeddedCheckout';
import SEOHead from '@/components/SEOHead';
import { ProtectedMedia } from '@/components/ProtectedMedia';
import { useContentProtection } from '@/hooks/useContentProtection';
import { SecureVideoPreviewCard } from '@/components/SecureVideoPreviewCard';
import { SecureVideoLightbox } from '@/components/SecureVideoLightbox';
import { SecureImageLightbox } from '@/components/SecureImageLightbox';
import { useGeoLocation } from '@/hooks/useGeoLocation';

import { PrivateLiveReplays } from '@/components/live/PrivateLiveReplays';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreatorTipButton } from '@/components/CreatorTipButton';
import PrivateLiveRequestDialog from '@/components/live/PrivateLiveRequestDialog';
import { SecureContentItem } from '@/components/SecureContentItem';

type ContentFilter = 'all' | 'image' | 'video';
type TabFilter = 'posts' | 'medias';

const CreatorPublicPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, signOut, userProfile } = useAuth();
  const { geoData } = useGeoLocation();
  const [creator, setCreator] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [preloadedSecret, setPreloadedSecret] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingContent, setLikingContent] = useState<string | null>(null);
  const [heartAnimation, setHeartAnimation] = useState<string | null>(null);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [activeTab, setActiveTab] = useState<TabFilter>('posts');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [scheduledLives, setScheduledLives] = useState<any[]>([]);
  const [showPrivateLiveDialog, setShowPrivateLiveDialog] = useState(false);
  const [privateReplaysCount, setPrivateReplaysCount] = useState(0);
  const [isGeoBlocked, setIsGeoBlocked] = useState(false);
  const [hideSubscriberCount, setHideSubscriberCount] = useState(false);

  useContentProtection(!showCheckout && !selectedImage);

  const RESERVED_PATHS = ['admin', 'backstage', 'dashboard', 'login', 'signup', 'auth', 'search', 'lives', 'live', 'install', 'terms', 'privacy', 'legal', 'cookies', 'security', 'profile', 'subscriptions', 'reset-password', 'suspended'];

  // Stats calculés
  const stats = useMemo(() => {
    const imageCount = content.filter(c => c.content_type === 'image').length;
    const videoCount = content.filter(c => c.content_type === 'video').length;
    const totalLikes = content.reduce((sum, c) => sum + (c.like_count || 0), 0);
    return { imageCount, videoCount, totalLikes };
  }, [content]);

  // Contenu filtré
  const filteredContent = useMemo(() => {
    if (contentFilter === 'all') return content;
    return content.filter(c => c.content_type === contentFilter);
  }, [content, contentFilter]);

  useEffect(() => {
    const loadCreator = async () => {
      if (!username) return;

      if (RESERVED_PATHS.includes(username.toLowerCase())) {
        setLoading(false);
        return;
      }
      try {
        let profileData = null;
        let profileError = null;

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);

        if (isUUID) {
          const result = await supabase
            .from('public_creator_profiles')
            .select('*')
            .eq('user_id', username)
            .single();
          profileData = result.data;
          profileError = result.error;
        } else {
          // D'abord chercher par username
          let result = await supabase
            .from('public_creator_profiles')
            .select('*')
            .eq('username', username)
            .maybeSingle();
          
          // Si pas trouvé, chercher par stage_name (slug format: lowercase, tirets)
          if (!result.data) {
            // Chercher tous les créateurs et matcher par stage_name slugifié
            const { data: allProfiles } = await supabase
              .from('public_creator_profiles')
              .select('*');
            
            if (allProfiles) {
              // Chercher le créateur correspondant au stage_name
              for (const p of allProfiles) {
                // Récupérer le stage_name du créateur
                const { data: creatorInfo } = await supabase
                  .from('public_creators')
                  .select('stage_name')
                  .eq('user_id', p.user_id)
                  .single();
                
                if (creatorInfo?.stage_name) {
                  // Créer le slug du stage_name
                  const stageNameSlug = creatorInfo.stage_name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
                  
                  if (stageNameSlug === username.toLowerCase()) {
                    profileData = p;
                    break;
                  }
                }
              }
            }
          }
          
          if (!profileData && result.data) {
            profileData = result.data;
          }
          profileError = result.error;
        }

        if (profileError) throw profileError;
        setProfile(profileData);

        const { data: creatorData, error: creatorError } = await supabase
          .from('public_creators')
          .select('*')
          .eq('user_id', profileData.user_id)
          .single();

        if (creatorError) throw creatorError;
        setCreator(creatorData);

        // Fetch privacy settings from creators table (not in public_creators view)
        const { data: privacyData } = await supabase
          .from('creators')
          .select('hide_subscriber_count, blocked_countries')
          .eq('id', creatorData.id)
          .single();

        if (privacyData?.hide_subscriber_count) {
          setHideSubscriberCount(true);
        }

        // Geo-blocking check
        if (privacyData?.blocked_countries && privacyData.blocked_countries.length > 0) {
          if (privacyData.blocked_countries.includes(geoData.countryCode)) {
            setIsGeoBlocked(true);
            setLoading(false);
            return;
          }
        }

        const { data: contentData } = await supabase
          .from('content')
          .select('*')
          .eq('creator_id', creatorData.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        setContent(contentData || []);

        if (user) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorData.id)
            .eq('status', 'active')
            .maybeSingle();

          setIsSubscribed(!!subData);

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
  }, [username, user, geoData.countryCode]);

  // Charger les lives programmés du créateur
  useEffect(() => {
    const loadScheduledLives = async () => {
      if (!creator?.id) return;
      
      try {
        const { data: lives } = await supabase
          .from('live_streams')
          .select('id, title, scheduled_at, is_premium, price')
          .eq('creator_id', creator.id)
          .eq('status', 'scheduled')
          .gt('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(3);
        
        setScheduledLives(lives || []);
      } catch (error) {
        console.error('Error loading scheduled lives:', error);
      }
    };

    loadScheduledLives();
  }, [creator?.id]);

  // Charger le nombre de replays privés disponibles
  useEffect(() => {
    const loadPrivateReplaysCount = async () => {
      if (!creator?.id) return;
      
      try {
        const { count } = await supabase
          .from('private_live_replays')
          .select('*', { count: 'exact', head: true })
          .eq('creator_id', creator.id)
          .eq('is_available', true);
        
        setPrivateReplaysCount(count || 0);
      } catch (error) {
        console.error('Error loading private replays count:', error);
      }
    };

    loadPrivateReplaysCount();
  }, [creator?.id]);

  useEffect(() => {
    const preloadCheckout = async () => {
      if (!user || !creator?.id || isSubscribed || creator.subscription_price <= 0) return;
      if (preloadedSecret) return;
      
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session?.access_token) return;
        
        const { data } = await supabase.functions.invoke('create-creator-checkout', {
          body: { creatorId: creator.id },
        });
        
        if (data?.clientSecret) {
          setPreloadedSecret(data.clientSecret);
        }
      } catch (error) {
        console.debug('Preload checkout:', error);
      }
    };

    preloadCheckout();
  }, [user?.id, creator?.id, isSubscribed]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.info('Connectez-vous pour vous abonner');
      navigate('/login');
      return;
    }

    if (!creator) return;

    // Vérifier si l'utilisateur est un créateur (sécurité: comptes séparés obligatoires)
    const { data: isCreator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (isCreator) {
      toast.error('Les créateurs ne peuvent pas s\'abonner avec leur compte créateur. Veuillez utiliser un compte utilisateur séparé.');
      return;
    }

    const price = creator.subscription_price ?? 0;

    if (price <= 0) {
      try {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('subscriber_id', user.id)
          .eq('creator_id', creator.id)
          .single();

        if (existingSub) {
          if (existingSub.status === 'active') {
            toast.error('Vous êtes déjà abonné à ce créateur');
            return;
          }
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', existingSub.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('subscriptions')
            .insert({
              subscriber_id: user.id,
              creator_id: creator.id,
              price: 0,
              currency: creator.currency
            });

          if (error) throw error;
        }

        setIsSubscribed(true);
        toast.success('Abonnement gratuit créé avec succès !');
      } catch (error: any) {
        if (error.message?.includes('créateurs ne peuvent pas')) {
          toast.error(error.message);
        } else {
          toast.error('Erreur lors de l\'abonnement : ' + error.message);
        }
      }
    } else {
      setShowCheckout(true);
    }
  };

  const handleUnsubscribe = async () => {
    if (!user || !creator) return;

    setUnsubscribing(true);
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, price')
        .eq('subscriber_id', user.id)
        .eq('creator_id', creator.id)
        .eq('status', 'active')
        .single();

      if (subscription?.stripe_subscription_id && subscription.price > 0) {
        const { data, error } = await supabase.functions.invoke('customer-portal', {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.info('Gérez votre abonnement dans le portail Stripe');
        }
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('subscriber_id', user.id)
          .eq('creator_id', creator.id)
          .eq('status', 'active');

        if (error) throw error;

        setIsSubscribed(false);
        toast.success('Désabonnement effectué');
      }
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

  const recordContentView = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('content_views')
        .insert({ 
          content_id: contentId, 
          viewer_id: user?.id || null 
        });

      if (!error) {
        const currentContent = content.find(c => c.id === contentId);
        await supabase
          .from('content')
          .update({ view_count: (currentContent?.view_count || 0) + 1 })
          .eq('id', contentId);

        setContent(prev => prev.map(c => 
          c.id === contentId ? { ...c, view_count: (c.view_count || 0) + 1 } : c
        ));
      }
    } catch (error) {
      console.debug('View already recorded or error:', error);
    }
  };

  const handleOpenImage = (item: any) => {
    setSelectedImage(item);
    recordContentView(item.id);
  };

  const handleLikeContent = async (contentId: string, showAnimation = true) => {
    if (!user) {
      toast.info('Connectez-vous pour liker');
      navigate('/login');
      return;
    }

    const isLiked = userLikes.has(contentId);
    if (showAnimation && !isLiked) {
      setHeartAnimation(contentId);
      setTimeout(() => setHeartAnimation(null), 800);
    }

    setLikingContent(contentId);

    try {
      const { data, error } = await supabase.rpc('toggle_content_like', {
        p_content_id: contentId
      });

      if (error) throw error;

      const result = data as { liked: boolean; like_count: number };

      if (result.liked) {
        setUserLikes(prev => new Set([...prev, contentId]));
        toast.success('❤️ Liked !');
      } else {
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });
      }

      setContent(prev => prev.map(c => 
        c.id === contentId ? { ...c, like_count: result.like_count } : c
      ));
      if (selectedImage?.id === contentId) {
        setSelectedImage((prev: any) => prev ? { ...prev, like_count: result.like_count } : null);
      }
    } catch (error: any) {
      console.error('Error liking content:', error);
      toast.error('Erreur lors du like');
    } finally {
      setLikingContent(null);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Affichage public: toujours privilégier le nom de scène, jamais le username
  const stageName = creator?.stage_name?.trim();
  const safeDisplayName = profile?.display_name && !profile.display_name.includes('@') ? profile.display_name : null;
  const creatorName = stageName || safeDisplayName || 'Créateur';
  const creatorDescription = profile?.bio 
    ? `${profile.bio.substring(0, 150)}${profile.bio.length > 150 ? '...' : ''}`
    : `Découvrez le profil de ${creatorName} sur Crub.`;
  const creatorImage = profile?.avatar_url || '/og-image.jpg';
  const creatorUrl = `https://crub.fr/creator/${profile?.username || username}`;

  // Geo-blocked page
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

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEOHead
        title={`${creatorName} - Profil Créateur`}
        description={creatorDescription}
        image={creatorImage}
        url={creatorUrl}
        type="profile"
        keywords={`${creatorName}, créateur Crub, ${creator?.category || 'contenu exclusif'}`}
        noindex={false}
        creator={{
          name: creatorName,
          username: profile?.username || '',
          category: creator?.category,
          bio: profile?.bio,
          subscriberCount: hideSubscriberCount ? 0 : (creator?.total_subscribers || 0),
          contentCount: content.length,
          isVerified: profile?.is_verified,
          subscriptionPrice: creator?.subscription_price,
          currency: creator?.currency || 'EUR',
          avatarUrl: profile?.avatar_url
        }}
        modifiedTime={creator?.updated_at}
      />
      {/* Cover Photo */}
      <div className="relative w-full h-[200px] sm:h-[260px] md:h-[320px] bg-gradient-to-br from-primary/30 to-primary/10 overflow-hidden">
        {profile.cover_url ? (
          <img 
            src={profile.cover_url} 
            alt={`Couverture de ${creatorName}`}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${profile.cover_position_x ?? 50}% ${profile.cover_position ?? 50}%` }}
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/30" />
        )}
      </div>

      {/* Profile Section */}
      <div className="relative px-4 sm:px-6 pb-4">
        {/* Avatar - chevauchement propre */}
        <div className="-mt-12 md:-mt-14 mb-3">
          <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-xl ring-2 ring-background">
            <AvatarImage src={profile.avatar_url} className="object-cover" />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {creatorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Nom et vérification */}
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-2xl font-bold">{creatorName}</h1>
          {profile.is_verified && (
            <CheckCircle2 className="h-5 w-5 text-primary fill-primary" />
          )}
        </div>

        {/* Catégorie et promo */}
        <p className="text-muted-foreground text-sm mt-1">
          {creator.category && <span>{creator.category}</span>}
          {creator.category && creator.is_featured && <span> • </span>}
          {creator.is_featured && (
            <span className="text-primary">⭐ Créateur en vedette</span>
          )}
        </p>

        {/* Stats en ligne */}
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{stats.imageCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Video className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{stats.videoCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{stats.totalLikes}</span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Bouton S'abonner */}
          {!user ? (
            <Link to="/login">
              <Button className="rounded-full h-9 px-5 text-sm font-medium bg-primary hover:bg-primary/90 shadow-sm">
                S'abonner
              </Button>
            </Link>
          ) : isSubscribed ? (
            <div className="flex gap-2">
              <Badge variant="default" className="justify-center py-2 px-4 text-sm rounded-full">
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                Abonné
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer le désabonnement</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir vous désabonner de {creatorName} ? Vous perdrez l'accès au contenu premium.
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
            <Button 
              className="rounded-full h-9 px-5 text-sm font-medium bg-primary hover:bg-primary/90 shadow-sm"
              onClick={handleSubscribe}
            >
              {creator.subscription_price > 0 
                ? `S'abonner · ${creator.subscription_price}€` 
                : "S'abonner"}
            </Button>
          )}

          {/* Bouton Message - Visible uniquement pour les abonnés */}
          {user && isSubscribed && creator && (
            <Button
              variant="outline"
              className="rounded-full h-9 px-4 text-sm font-medium gap-2"
              onClick={() => navigate(`/messagerie/${creator.id}`)}
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </Button>
          )}

          {/* Bouton Tip */}
          <CreatorTipButton 
            creatorId={creator.id}
            creatorName={creatorName}
            variant="outline"
            size="sm"
          />

          {/* Bouton Demander un live privé */}
          {user && (
            <Button
              variant="outline"
              className="rounded-full h-9 px-4 text-sm font-medium gap-2"
              onClick={() => setShowPrivateLiveDialog(true)}
            >
              <Video className="h-4 w-4" />
              Live privé
            </Button>
          )}
        </div>

        {/* Bio avec "Voir plus" */}
        {profile.bio && (
          <div className="mt-4">
            <p className={`text-sm text-primary ${!bioExpanded ? 'line-clamp-2' : ''}`}>
              {profile.bio}
            </p>
            {profile.bio.length > 100 && (
              <button
                onClick={() => setBioExpanded(!bioExpanded)}
                className="text-muted-foreground text-sm mt-1 flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {bioExpanded ? (
                  <>Voir moins <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Voir plus <ChevronDown className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Liens réseaux sociaux */}
        {(profile.instagram_url || profile.twitter_url || profile.tiktok_url || profile.youtube_url) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.instagram_url && (
              <a
                href={profile.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </a>
            )}
            {profile.twitter_url && (
              <a
                href={profile.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X
              </a>
            )}
            {profile.tiktok_url && (
              <a
                href={profile.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                TikTok
              </a>
            )}
            {profile.youtube_url && (
              <a
                href={profile.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Youtube className="h-3.5 w-3.5" />
                YouTube
              </a>
            )}
          </div>
        )}

        {/* Section Prochains Lives programmés */}
        {scheduledLives.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-red-500/10 to-primary/10 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Radio className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Prochains Lives</h3>
            </div>
            <div className="space-y-2">
              {scheduledLives.map((live) => (
                <div 
                  key={live.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{live.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(live.scheduled_at).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {live.is_premium && (
                      <Badge variant="secondary" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        {live.price ? `${live.price}€` : 'Premium'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Posts / Médias */}
      <div className="border-b border-border sticky top-0 bg-background z-40">
        <div className="flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors relative ${
              activeTab === 'posts' 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              {content.length} Posts
            </div>
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('medias')}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors relative ${
              activeTab === 'medias' 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              {privateReplaysCount} Médias
            </div>
            {activeTab === 'medias' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Filtre photos/vidéos */}
      <div className="p-4 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="rounded-full gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setContentFilter('all')}>
              <Grid3X3 className="h-4 w-4 mr-2" />
              Tout ({content.length})
              {contentFilter === 'all' && <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setContentFilter('image')}>
              <Image className="h-4 w-4 mr-2" />
              Photos ({stats.imageCount})
              {contentFilter === 'image' && <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setContentFilter('video')}>
              <Video className="h-4 w-4 mr-2" />
              Vidéos ({stats.videoCount})
              {contentFilter === 'video' && <CheckCircle2 className="h-4 w-4 ml-auto text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grille de contenu - responsive avec plus de colonnes sur desktop */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0">
          {filteredContent.map((item) => {
            const canView = !item.is_premium || isSubscribed;
            
            return (
              <ProtectedMedia
                key={item.id}
                className="relative aspect-square overflow-hidden cursor-pointer group"
                watermarkText={canView ? creatorName : undefined}
                enableForensicWatermark={canView && item.is_premium}
              >
                <div 
                  className="w-full h-full"
                  onClick={() => canView && handleOpenImage(item)}
                  onDoubleClick={() => canView && handleLikeContent(item.id)}
                >
                  <SecureContentItem
                    item={item}
                    canView={canView}
                  />

                  {/* Durée vidéo seulement - PAS de bouton play */}
                  {item.content_type === 'video' && canView && item.duration && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(item.duration)}
                      </span>
                    </div>
                  )}

                  {/* Icône verrou pour premium non débloqué ou prix pour abonnés */}
                  {item.is_premium && !isSubscribed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="bg-black/60 rounded-full p-3">
                        <Lock className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Prix affiché pour contenu premium accessible aux abonnés */}
                  {item.is_premium && isSubscribed && item.price && item.price > 0 && (
                    <div className="absolute bottom-2 left-2 z-20">
                      <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {item.price.toFixed(2)}€
                      </div>
                    </div>
                  )}

                  {/* Animation cœur */}
                  {heartAnimation === item.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                      <Heart className="h-16 w-16 text-red-500 fill-red-500 animate-heart-burst drop-shadow-lg" />
                    </div>
                  )}
                </div>
              </ProtectedMedia>
            );
          })}
        </div>
      )}

      {/* Message si pas de contenu */}
      {filteredContent.length === 0 && activeTab === 'posts' && (
        <div className="py-12 text-center text-muted-foreground">
          <p>Aucun contenu disponible</p>
        </div>
      )}

      {/* Onglet Médias - Replays privés à l'achat */}
      {activeTab === 'medias' && creator && (
        <div className="px-4 pb-8">
          <PrivateLiveReplays 
            creatorId={creator.id}
            creatorName={creator.stage_name || profile?.display_name}
          />
        </div>
      )}


      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Abonnement à {creatorName}</DialogTitle>
          </DialogHeader>
          {creator && showCheckout && (
            <EmbeddedCheckout 
              creatorId={creator.id} 
              onClose={() => setShowCheckout(false)} 
              preloadedSecret={preloadedSecret} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-[10000] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            ✕
          </button>
          
          <div 
            className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative" onDoubleClick={() => handleLikeContent(selectedImage.id)}>
              {selectedImage.content_type === 'video' ? (
                <SecureVideoLightbox
                  src={selectedImage.file_url}
                  contentId={selectedImage.id}
                  isPremium={selectedImage.is_premium}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  autoPlay
                  controls
                />
              ) : (
                <SecureImageLightbox
                  src={selectedImage.thumbnail_url || selectedImage.file_url}
                  contentId={selectedImage.id}
                  alt={selectedImage.title}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg cursor-pointer"
                />
              )}
              
              {heartAnimation === selectedImage.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="h-32 w-32 text-red-500 fill-red-500 animate-heart-burst drop-shadow-2xl" />
                </div>
              )}
            </div>
            
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
                  onClick={() => handleLikeContent(selectedImage.id)}
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
      {/* Dialog demande de live privé */}
      <PrivateLiveRequestDialog
        open={showPrivateLiveDialog}
        onOpenChange={setShowPrivateLiveDialog}
        creatorId={creator.id}
        creatorName={creatorName}
      />
    </div>
  );
};

export default CreatorPublicPage;
