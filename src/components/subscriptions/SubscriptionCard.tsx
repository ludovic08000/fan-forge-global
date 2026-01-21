import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Clock, RefreshCw, Loader2, ExternalLink, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { EmbeddedCheckout } from '@/components/EmbeddedCheckout';
import { useCsrfToken } from '@/hooks/useCsrfToken';

interface Subscription {
  id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  price: number;
  currency: string;
  creator: {
    id: string;
    user_id: string;
    stage_name: string | null;
    subscription_price: number;
    profile: {
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  };
}

interface SubscriptionCardProps {
  subscription: Subscription;
  onUpdate: () => void;
}

export const SubscriptionCard = ({ subscription, onUpdate }: SubscriptionCardProps) => {
  const [isCanceling, setIsCanceling] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const { generateToken } = useCsrfToken();
  
  const creator = subscription.creator;
  const profile = creator.profile;
  const displayName = creator.stage_name || profile?.display_name || profile?.username || 'Créateur';
  const username = profile?.username;
  const isActive = subscription.status === 'active';
  const linkPath = username ? `/${username}` : `/creator/${creator.user_id}`;

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const csrfToken = await generateToken();
      
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscriptionId: subscription.id, csrfToken }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Abonnement annulé');
        setShowConfirmCancel(false);
        onUpdate();
      } else {
        throw new Error(data?.error || 'Erreur');
      }
    } catch (error: any) {
      toast.error(error.message || 'Impossible d\'annuler');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleResubscribe = () => {
    if (creator.subscription_price <= 0) {
      window.location.href = linkPath;
      return;
    }
    setShowCheckout(true);
  };

  return (
    <>
      <Card className={`overflow-hidden transition-all ${isActive ? 'border-primary/20' : 'opacity-75'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Link to={linkPath} className="flex-shrink-0">
              <Avatar className="h-14 w-14 ring-2 ring-primary/10 hover:ring-primary/30 transition-all">
                <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={linkPath} className="font-semibold hover:text-primary transition-colors line-clamp-1">
                  {displayName}
                </Link>
                <Badge 
                  variant={isActive ? 'default' : 'secondary'}
                  className={isActive ? 'bg-green-500/90' : ''}
                >
                  {isActive ? 'Actif' : 'Expiré'}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(subscription.start_date), 'dd MMM yyyy', { locale: fr })}
                </span>
                
                {subscription.end_date && (
                  <span className={`flex items-center gap-1 ${isActive ? 'text-primary' : 'text-destructive'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {isActive ? 'Renouvelle' : 'Expiré'} {format(new Date(subscription.end_date), 'dd MMM', { locale: fr })}
                  </span>
                )}
                
                <span className="font-medium text-foreground">
                  {creator.subscription_price > 0 ? `${creator.subscription_price}€/mois` : 'Gratuit'}
                </span>
              </div>
            </div>

            {/* Actions - Plus compact */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isActive ? (
                <>
                  <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                    <Link to={linkPath}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowConfirmCancel(true)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={handleResubscribe}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Réabonner
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmation */}
      <Dialog open={showConfirmCancel} onOpenChange={setShowConfirmCancel}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Se désabonner ?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Vous perdrez l'accès au contenu exclusif de <span className="font-medium text-foreground">{displayName}</span>.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowConfirmCancel(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
            >
              {isCanceling && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de paiement */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Se réabonner à {displayName}</DialogTitle>
          </DialogHeader>
          <EmbeddedCheckout 
            creatorId={creator.id} 
            onClose={() => {
              setShowCheckout(false);
              onUpdate();
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
