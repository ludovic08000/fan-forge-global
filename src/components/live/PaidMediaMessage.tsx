/**
 * Composant d'affichage d'un média payant dans le chat
 */

import { useState } from 'react';
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
  isPaid?: boolean;
  creatorName: string;
}

export const PaidMediaMessage = ({
  mediaId,
  type,
  price,
  thumbnailUrl,
  isPaid = false,
  creatorName,
}: PaidMediaMessageProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(isPaid);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (!user) {
      toast.error('Connectez-vous pour débloquer ce contenu');
      return;
    }

    setLoading(true);
    try {
      // Appeler l'edge function pour créer le checkout
      const { data, error } = await supabase.functions.invoke('pay-private-content', {
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
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      toast.error('Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

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
