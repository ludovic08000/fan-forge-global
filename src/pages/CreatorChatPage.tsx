/**
 * Page de chat pour les créateurs avec leurs abonnés
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ModernPrivateChat from '@/components/ModernPrivateChat';
import SEOHead from '@/components/SEOHead';

const CreatorChatPage = () => {
  const { subscriberId } = useParams<{ subscriberId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subscriber, setSubscriber] = useState<any>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!subscriberId || !user) {
        setLoading(false);
        return;
      }

      try {
        // Vérifier que l'utilisateur est bien un créateur
        const { data: creatorData, error: creatorError } = await supabase
          .from('creators')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (creatorError || !creatorData) {
          toast.error('Accès réservé aux créateurs');
          navigate('/messages');
          return;
        }

        setCreatorId(creatorData.id);

        // Récupérer les infos de l'abonné
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', subscriberId)
          .single();

        setSubscriber(profileData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement');
        navigate('/messages');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [subscriberId, user, navigate]);

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
          <Link to="/login">
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

  if (!subscriber || !creatorId) {
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
          <p className="text-muted-foreground mb-6">Conversation introuvable</p>
          <Button onClick={() => navigate('/messages')} variant="outline" className="rounded-full">
            Retour aux messages
          </Button>
        </motion.div>
      </div>
    );
  }

  const subscriberName = subscriber?.display_name || subscriber?.username || 'Utilisateur';

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      <SEOHead
        title={`Message avec ${subscriberName}`}
        description={`Chat privé avec ${subscriberName} sur TheForge`}
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
            
            <div className="flex items-center gap-3 flex-1 min-w-0 py-2 px-1">
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarImage src={subscriber?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-sm">
                    {subscriberName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Nom */}
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-sm truncate">{subscriberName}</h1>
                <span className="text-xs text-muted-foreground">Abonné</span>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Chat plein écran */}
      <main className="flex-1 pt-14">
        <div className="h-[calc(100dvh-3.5rem)] max-w-lg mx-auto">
          <ModernPrivateChat
            creatorId={creatorId}
            creatorName={subscriberName}
            creatorAvatar={subscriber?.avatar_url}
            subscriberId={subscriberId}
            fullScreen
          />
        </div>
      </main>
    </div>
  );
};

export default CreatorChatPage;
