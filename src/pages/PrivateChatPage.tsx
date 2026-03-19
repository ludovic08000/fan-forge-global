/**
 * Page de chat privé plein écran style Instagram/Snapchat
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Phone, Video, Info, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ModernPrivateChat from '@/components/ModernPrivateChat';
import SEOHead from '@/components/SEOHead';
import { cn } from '@/lib/utils';

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
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-inset">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl">💬</span>
          </div>
          <p className="text-muted-foreground mb-6">Connectez-vous pour accéder aux messages</p>
          <Link to="/auth">
            <Button size="lg" className="rounded-full px-8">Se connecter</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-inset">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  if (!creator || !isSubscribed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center safe-area-inset">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6"
        >
          <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="text-muted-foreground mb-6">Vous devez être abonné pour accéder aux messages</p>
          <Button onClick={() => navigate(-1)} variant="outline" className="rounded-full">
            Retour
          </Button>
        </motion.div>
      </div>
    );
  }

  const creatorName = creator?.stage_name || profile?.display_name || profile?.username || 'Créateur';

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      <SEOHead
        title={`Message privé avec ${creatorName}`}
        description={`Chat privé avec ${creatorName} sur TheForge`}
      />

      {/* Header Instagram-style */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40"
      >
        <div className="flex items-center justify-between px-2 h-14 max-w-lg mx-auto">
          {/* Back + User info */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/messages')}
              className="shrink-0 h-10 w-10 rounded-full hover:bg-muted/60"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <Link 
              to={`/${profile?.username || creatorId}`}
              className="flex items-center gap-3 flex-1 min-w-0 py-2 px-1 rounded-xl hover:bg-muted/40 transition-colors"
            >
              {/* Avatar avec indicateur en ligne */}
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary via-pink-500 to-orange-400 rounded-full opacity-75" />
                <Avatar className="h-9 w-9 ring-2 ring-background relative">
                  <AvatarImage src={profile?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-sm">
                    {creatorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>
              
              {/* Nom + statut */}
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm truncate">{creatorName}</h1>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">En ligne</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-muted/60"
              onClick={() => navigate(`/${profile?.username || creatorId}`)}
            >
              <Info className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Chat plein écran */}
      <main className="flex-1 pt-14">
        <div className="h-[calc(100dvh-3.5rem)] max-w-lg mx-auto">
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
