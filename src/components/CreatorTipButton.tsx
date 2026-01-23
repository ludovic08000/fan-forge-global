/**
 * Composant pour envoyer des tips/pourboires à un créateur (hors live)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coins, Loader2, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CreatorTipButtonProps {
  creatorId: string;
  creatorName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const TIP_AMOUNTS = [1, 2, 5, 10, 20, 50];

export const CreatorTipButton = ({ 
  creatorId, 
  creatorName, 
  variant = 'outline',
  size = 'default',
  className = ''
}: CreatorTipButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('5');
  const [message, setMessage] = useState('');

  const handleSendTip = async () => {
    if (!user) {
      toast.info('Connectez-vous pour envoyer un tip');
      navigate('/login');
      return;
    }

    // Vérifier si l'utilisateur est un créateur (sécurité: comptes séparés obligatoires)
    const { data: isCreator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (isCreator) {
      toast.error('Les créateurs ne peuvent pas envoyer de tips avec leur compte créateur. Veuillez utiliser un compte utilisateur séparé.');
      return;
    }

    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount < 1) {
      toast.error('Montant minimum: 1€');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Préparation du paiement...');
    
    try {
      const { data, error } = await supabase.functions.invoke('create-creator-tip', {
        body: {
          creatorId,
          amount: tipAmount,
          message: message.trim() || undefined,
        },
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      if (data?.url) {
        setOpen(false);
        setAmount('5');
        setMessage('');
        window.open(data.url, '_blank');
        toast.success('Paiement ouvert dans un nouvel onglet');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Tip error:', error);
      toast.error('Erreur lors de l\'envoi du tip');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !user) {
      toast.info('Connectez-vous pour envoyer un tip');
      navigate('/login');
      return;
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant={variant}
          size={size}
          className={`gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 ${className}`}
        >
          <Coins className="h-4 w-4" />
          Tip
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Envoyer un tip à {creatorName || 'ce créateur'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Montants rapides */}
          <div className="space-y-2">
            <Label>Choisir un montant</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIP_AMOUNTS.map((tipAmount) => (
                <Button
                  key={tipAmount}
                  type="button"
                  variant={amount === String(tipAmount) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(String(tipAmount))}
                  className="font-semibold"
                >
                  {tipAmount}€
                </Button>
              ))}
            </div>
          </div>

          {/* Montant personnalisé */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount">Ou montant personnalisé (€)</Label>
            <Input
              id="custom-amount"
              type="number"
              min="1"
              step="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5.00"
            />
          </div>

          {/* Message optionnel */}
          <div className="space-y-2">
            <Label htmlFor="tip-message">Message (optionnel)</Label>
            <Textarea
              id="tip-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Merci pour ton contenu ! 💪"
              maxLength={200}
              rows={2}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/200
            </p>
          </div>

          {/* Bouton d'envoi */}
          <Button
            onClick={handleSendTip}
            disabled={loading || !amount || parseFloat(amount) < 1}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Coins className="h-4 w-4" />
                Envoyer {amount}€
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Paiement sécurisé. 85% vont au créateur.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
