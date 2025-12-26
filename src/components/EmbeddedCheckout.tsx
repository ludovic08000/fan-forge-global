import { useEffect, useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { Separator } from '@/components/ui/separator';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface EmbeddedCheckoutProps {
  creatorId: string;
  onClose: () => void;
  preloadedSecret?: string | null;
}

export const EmbeddedCheckout = ({ creatorId, onClose, preloadedSecret }: EmbeddedCheckoutProps) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number } | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  // Décoder le clientSecret si nécessaire (URL encoded)
  const decodeSecret = (secret: string): string => {
    try {
      // Si le secret contient des caractères encodés, le décoder
      if (secret.includes('%')) {
        return decodeURIComponent(secret);
      }
      return secret;
    } catch {
      return secret;
    }
  };

  const fetchCheckoutSession = async (referralCode?: string | null) => {
    try {
      setIsRefetching(true);
      const { data, error } = await supabase.functions.invoke('create-creator-checkout', {
        body: { 
          creatorId,
          referralCode: referralCode || undefined
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data.clientSecret) {
        setClientSecret(decodeSecret(data.clientSecret));
      } else {
        throw new Error('Aucun clientSecret reçu');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Erreur lors du chargement du paiement');
    } finally {
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    // Si déjà préchargé et pas de code promo, utiliser le secret préchargé
    if (preloadedSecret && !promoCode) {
      setClientSecret(decodeSecret(preloadedSecret));
      return;
    }

    // Ne pas fetch si on n'a pas de promoCode et qu'on attend un préchargé
    if (!promoCode && preloadedSecret) {
      return;
    }

    // Fetch with promo code if available, ou fetch initial si pas de préchargé
    fetchCheckoutSession(promoCode);
  }, [creatorId, promoCode]); // Retirer preloadedSecret des dépendances

  const handlePromoCodeValidated = async (code: string | null, discountInfo: { type: 'percentage' | 'fixed'; value: number } | null) => {
    setDiscount(discountInfo);
    
    // Si un code est validé, refetch immédiatement avec ce code
    if (code) {
      setClientSecret(''); // Reset pour afficher le loader
      setPromoCode(code);
    } else {
      setPromoCode(null);
      // Si pas de code et qu'on a un préchargé, le réutiliser
      if (preloadedSecret) {
        setClientSecret(decodeSecret(preloadedSecret));
      }
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <button onClick={onClose} className="text-primary underline">Fermer</button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Promo code input */}
      <div className="p-4 border-b">
        <PromoCodeInput
          creatorId={creatorId}
          onCodeValidated={handlePromoCodeValidated}
        />
      </div>

      {/* Checkout form */}
      <div className="min-h-[500px]">
        {!clientSecret || isRefetching ? (
          <div className="flex items-center justify-center p-8 h-[500px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <StripeEmbeddedCheckout className="w-full" />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );
};
