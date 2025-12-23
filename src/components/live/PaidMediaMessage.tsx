/**
 * Composant d'affichage d'un média payant dans le chat
 * Vérifie automatiquement si le paiement est confirmé via le webhook Stripe
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Image, Video, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PaidMediaMessageProps {
  mediaId: string;
  type: 'image' | 'video';
  price: number;
  thumbnailUrl?: string;
  mediaUrl?: string; // URL du média (disponible après paiement)
  isPaid?: boolean;
  creatorName: string;
  isLiveMedia?: boolean;
  liveStreamId?: string;
}

export const PaidMediaMessage = ({
  mediaId,
  type,
  price,
  thumbnailUrl,
  mediaUrl: initialMediaUrl,
  isPaid = false,
  creatorName,
  isLiveMedia = true,
  liveStreamId,
}: PaidMediaMessageProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(isPaid);
  const [mediaUrl, setMediaUrl] = useState<string | null>(initialMediaUrl || null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Vérifier le statut du paiement au chargement et périodiquement
  useEffect(() => {
    if (!user || unlocked || !isLiveMedia) return;

    const checkPaymentStatus = async () => {
      try {
        // Vérifier si le paiement est confirmé dans la base de données
        const { data: payment, error } = await supabase
          .from('live_stream_payments')
          .select('status')
          .eq('subscriber_id', user.id)
          .eq('status', 'completed')
          .limit(1);

        if (!error && payment && payment.length > 0) {
          // Paiement confirmé, récupérer l'URL du média
          const { data: message } = await supabase
            .from('live_stream_messages')
            .select('content_offer')
            .eq('id', mediaId)
            .single();

          if (message?.content_offer) {
            const contentOffer = message.content_offer as any;
            setMediaUrl(contentOffer.media_url);
            setUnlocked(true);
            toast.success('Contenu débloqué !');
          }
        }
      } catch (error) {
        console.error('Erreur vérification paiement:', error);
      }
    };

    // Vérifier immédiatement si on vient d'une redirection Stripe
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('live_media_success') === 'true' && urlParams.get('message_id') === mediaId) {
      setCheckingPayment(true);
      // Attendre un peu que le webhook traite le paiement
      setTimeout(() => {
        checkPaymentStatus();
        setCheckingPayment(false);
        // Nettoyer l'URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 2000);
    } else {
      // Vérifier le statut au chargement
      checkPaymentStatus();
    }

    // Écouter les notifications en temps réel pour les paiements confirmés
    const channel = supabase
      .channel(`payment-${mediaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as any;
          if (notification.type === 'payment_success' && notification.data?.message_id === mediaId) {
            checkPaymentStatus();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, mediaId, unlocked, isLiveMedia]);

  const handleUnlock = async () => {
    if (!user) {
      toast.error('Connectez-vous pour débloquer ce contenu');
      return;
    }

    setLoading(true);
    try {
      const functionName = isLiveMedia ? 'pay-live-media' : 'pay-private-content';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          messageId: mediaId,
          returnUrl: window.location.href,
        },
      });

      if (error) throw error;

      if (data.alreadyPaid) {
        setUnlocked(true);
        setMediaUrl(data.mediaUrl);
        toast.success('Contenu déjà débloqué!');
        return;
      }

      if (data.url) {
        // Ouvrir Stripe Checkout dans un nouvel onglet
        window.open(data.url, '_blank');
        toast.info('Finalisez votre paiement dans le nouvel onglet');
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  // Affichage du contenu débloqué
  if (unlocked && mediaUrl) {
    return (
      <div className="rounded-lg overflow-hidden max-w-xs">
        {type === 'video' ? (
          <video src={mediaUrl} controls className="w-full rounded" />
        ) : (
          <img src={mediaUrl} alt="Contenu débloqué" className="w-full rounded" />
        )}
        <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
          <Check className="h-3 w-3" />
          Débloqué
        </div>
      </div>
    );
  }

  // Vérification du paiement en cours
  if (checkingPayment) {
    return (
      <Card className="p-3 max-w-xs bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-green-500" />
          <span className="text-sm text-green-600">Vérification du paiement...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 max-w-xs bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <div className="space-y-2">
        {/* Preview floutée ou placeholder */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt="Aperçu" 
              className="w-full h-full object-cover blur-xl scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
              {type === 'video' ? (
                <Video className="h-8 w-8 text-primary/50" />
              ) : (
                <Image className="h-8 w-8 text-primary/50" />
              )}
            </div>
          )}
          
          {/* Overlay verrouillé */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Lock className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Info et bouton */}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {type === 'video' ? '🎬 Vidéo' : '📷 Photo'} exclusive de {creatorName}
          </p>
          <Button 
            onClick={handleUnlock} 
            disabled={loading}
            size="sm"
            className="w-full"
            variant="premium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Débloquer ({price.toFixed(2)}€)
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};
