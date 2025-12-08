/**
 * Composant pour afficher et gérer les offres de contenu dans le chat live
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingBag, Euro, Gift, Image } from 'lucide-react';
import { ContentOffer } from '@/hooks/useLiveChat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ContentOfferCardProps {
  offer: ContentOffer;
}

/**
 * Carte affichant une offre de contenu dans le chat
 */
export const ContentOfferCard = ({ offer }: ContentOfferCardProps) => {
  const { user } = useAuth();

  const handleBuy = async () => {
    if (!user) {
      toast.error('Connectez-vous pour acheter ce contenu');
      return;
    }

    try {
      // Rediriger vers le paiement du contenu
      const { data, error } = await supabase.functions.invoke('pay-private-content', {
        body: { contentId: offer.content_id },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      } else if (data.alreadyPurchased) {
        toast.success('Vous avez déjà accès à ce contenu!');
      }
    } catch (error) {
      console.error('Error buying content:', error);
      toast.error('Erreur lors de l\'achat');
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 my-2">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {offer.thumbnail_url ? (
            <img 
              src={offer.thumbnail_url} 
              alt={offer.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
              <Image className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Offre spéciale</span>
            </div>
            <p className="text-sm font-medium truncate">{offer.title}</p>
            <div className="flex items-center gap-1 text-primary font-bold">
              <Euro className="h-4 w-4" />
              <span>{offer.price.toFixed(2)}</span>
            </div>
          </div>
          <Button size="sm" variant="premium" onClick={handleBuy}>
            <ShoppingBag className="h-4 w-4 mr-1" />
            Acheter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface ContentOfferSelectorProps {
  onSelectContent: (content: ContentOffer) => void;
  creatorId: string;
}

/**
 * Dialogue pour sélectionner du contenu à proposer
 */
export const ContentOfferSelector = ({ onSelectContent, creatorId }: ContentOfferSelectorProps) => {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    const fetchContents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('content')
          .select('id, title, price, thumbnail_url, is_premium')
          .eq('creator_id', creatorId)
          .eq('status', 'published')
          .eq('is_premium', true)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setContents(data || []);
      } catch (error) {
        console.error('Error fetching contents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [open, creatorId]);

  const handleSelect = (content: any) => {
    onSelectContent({
      content_id: content.id,
      title: content.title,
      price: content.price || 0,
      thumbnail_url: content.thumbnail_url,
    });
    setOpen(false);
    toast.success('Offre envoyée dans le chat!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Gift className="h-4 w-4" />
          Proposer du contenu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Proposer du contenu à vendre</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : contents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun contenu premium disponible</p>
              <p className="text-sm mt-2">Créez d'abord du contenu premium depuis votre dashboard</p>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {contents.map((content) => (
                <Card 
                  key={content.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelect(content)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {content.thumbnail_url ? (
                        <img 
                          src={content.thumbnail_url} 
                          alt={content.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <Image className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{content.title}</p>
                        <div className="flex items-center gap-1 text-primary">
                          <Euro className="h-3 w-3" />
                          <span className="text-sm font-semibold">{content.price?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <Badge variant="secondary">Premium</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
