import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Heart, 
  Eye, 
  Lock, 
  Play,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useContent, Content } from '@/hooks/useContent';
import { ProtectedMedia } from '@/components/ProtectedMedia';
import SEOHead from '@/components/SEOHead';

const ContentDetail: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isContentLiked, likeMutation, recordView } = useContent();
  
  const [content, setContent] = useState<Content | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const viewRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      if (!contentId) return;

      try {
        // Charger le contenu
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select('*')
          .eq('id', contentId)
          .single();

        if (contentError || !contentData) {
          console.error('Content not found:', contentError);
          navigate('/404');
          return;
        }

        setContent(contentData as Content);

        // Charger le créateur
        const { data: creatorData } = await supabase
          .from('creators')
          .select('*, profiles:user_id(username, display_name, avatar_url)')
          .eq('id', contentData.creator_id)
          .single();

        if (creatorData) {
          // Fetch profile via public view for security (no sensitive data)
          const { data: profileData } = await supabase
            .from('public_creator_profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', creatorData.user_id)
            .single();
            
          setCreator({ ...creatorData, profile: profileData });
        }

        // Vérifier abonnement
        if (user && creatorData) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorData.id)
            .eq('status', 'active')
            .maybeSingle();

          setIsSubscribed(!!subData);
        }

        // Enregistrer la vue une seule fois par contenu
        if (viewRecordedRef.current !== contentId) {
          viewRecordedRef.current = contentId;
          recordView(contentId);
        }
      } catch (error) {
        console.error('Error loading content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, user, navigate]);

  const handleLike = () => {
    if (!user) {
      toast.info('Connectez-vous pour liker ce contenu');
      navigate('/login');
      return;
    }
    if (content) {
      likeMutation.mutate(content.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Contenu non trouvé</h1>
          <Button onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>
    );
  }

  const canView = !content.is_premium || isSubscribed;
  const creatorName = creator?.stage_name || creator?.profile?.display_name || 'Créateur';
  const isLiked = isContentLiked(content.id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background pt-16">
      <SEOHead
        title={content.title}
        description={content.description || `Contenu de ${creatorName}`}
      />

      {/* Header */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Media */}
        <Card className="overflow-hidden mb-6">
          <ProtectedMedia
            className="relative bg-black"
            watermarkText={content.is_premium ? creatorName : undefined}
            enableForensicWatermark={content.is_premium && isSubscribed}
          >
            {canView ? (
              content.content_type === 'video' ? (
                <video
                  src={content.file_url}
                  controls
                  className="w-full max-h-[70vh] object-contain"
                  poster={content.thumbnail_url || undefined}
                  playsInline
                />
              ) : (
                <img
                  src={content.file_url}
                  alt={content.title}
                  className="w-full max-h-[70vh] object-contain"
                />
              )
            ) : (
              <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <div className="text-center p-8">
                  <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Contenu Premium</h3>
                  <p className="text-muted-foreground mb-4">
                    Abonnez-vous pour accéder à ce contenu
                  </p>
                  <Button 
                    onClick={() => navigate(`/creator/${creator?.user_id}`)}
                    className="gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Voir les offres d'abonnement
                  </Button>
                </div>
              </div>
            )}
          </ProtectedMedia>
        </Card>

        {/* Content Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Title & Badges */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {content.is_premium && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Premium
                  </Badge>
                )}
                <Badge variant="outline">
                  {content.content_type === 'video' ? 'Vidéo' : 'Photo'}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{content.title}</h1>
            </div>

            {/* Description */}
            {content.description && (
              <p className="text-muted-foreground">{content.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{content.view_count} vues</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{content.like_count} likes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(content.created_at)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                variant={isLiked ? "default" : "outline"}
                onClick={handleLike}
                className={`gap-2 ${isLiked ? 'bg-red-500 hover:bg-red-600' : ''}`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                {isLiked ? 'Liké' : 'Liker'}
              </Button>
            </div>
          </div>

          {/* Creator Card */}
          <div>
            <Card>
              <CardContent className="p-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => creator && navigate(`/creator/${creator.user_id}`)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creator?.profile?.avatar_url} />
                    <AvatarFallback>
                      {creatorName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{creatorName}</p>
                  </div>
                </div>

                {!isSubscribed && creator && (
                  <Button 
                    className="w-full mt-4 gap-2"
                    onClick={() => navigate(`/creator/${creator.user_id}`)}
                  >
                    <Lock className="h-4 w-4" />
                    S'abonner
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentDetail;
