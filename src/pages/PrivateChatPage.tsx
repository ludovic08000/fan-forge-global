/**
 * Page de chat privé plein écran pour les abonnés
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Shield, Phone, Video, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ModernPrivateChat from '@/components/ModernPrivateChat';
import SEOHead from '@/components/SEOHead';

const PrivateChatPage = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCreator = async () => {
      if (!creatorId || !user) {
        setLoading(false);
        return;
      }

      try {
        // Récupérer les infos créateur
        const { data: creatorData, error: creatorError } = await supabase
          .from('public_creators')
          .select('*')
          .eq('id', creatorId)
          .single();

        if (creatorError) throw creatorError;
        setCreator(creatorData);

        // Récupérer le profil
        const { data: profileData } = await supabase
          .from('public_creator_profiles')
          .select('*')
          .eq('user_id', creatorData.user_id)
          .single();

        setProfile(profileData);

        // Vérifier si abonné
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('subscriber_id', user.id)
          .eq('creator_id', creatorId)
          .eq('status', 'active')
          .maybeSingle();

        setIsSubscribed(!!subData);

        if (!subData) {
          toast.error('Vous devez être abonné pour envoyer des messages');
          navigate(`/${profileData?.username || creatorId}`);
        }
      } catch (error) {
        console.error('Error loading creator:', error);
        toast.error('Erreur lors du chargement');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadCreator();
  }, [creatorId, user, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Connectez-vous pour accéder aux messages</p>
          <Link to="/auth">
            <Button>Se connecter</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!creator || !isSubscribed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Vous devez être abonné pour accéder aux messages</p>
          <Button onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>
    );
  }

  const creatorName = creator?.stage_name || profile?.display_name || profile?.username || 'Créateur';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={`Message privé avec ${creatorName}`}
        description={`Chat privé avec ${creatorName} sur Crub`}
      />

      {/* Header fixe */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <Link 
              to={`/${profile?.username || creatorId}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {creatorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <h1 className="font-semibold text-base">{creatorName}</h1>
                <span className="text-xs text-emerald-500">En ligne</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-muted-foreground/50" />
          </div>
        </div>
      </header>

      {/* Chat plein écran */}
      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)]">
          <ModernPrivateChat
            creatorId={creator.id}
            creatorName={creatorName}
            creatorAvatar={profile?.avatar_url}
            fullScreen
          />
        </div>
      </main>
    </div>
  );
};

export default PrivateChatPage;
