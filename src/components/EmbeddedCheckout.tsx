import { useEffect, useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { Separator } from '@/components/ui/separator';
import { useCsrfToken } from '@/hooks/useCsrfToken';

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
  const [isLoading, setIsLoading] = useState(true);
  const [promoCodeChecked, setPromoCodeChecked] = useState(false);
  const { generateToken } = useCsrfToken();

  // Décoder le clientSecret si nécessaire (URL encoded)
  const decodeSecret = (secret: string): string => {
    try {
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
      setIsLoading(true);
      console.log('[EmbeddedCheckout] Fetching checkout session with referralCode:', referralCode);
      
      // Récupérer le token CSRF
      const csrfToken = await generateToken();
      
      const { data, error } = await supabase.functions.invoke('create-creator-checkout', {
        body: { 
          creatorId,
          referralCode: referralCode || undefined,
          csrfToken
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      if (data.clientSecret) {
        console.log('[EmbeddedCheckout] Got clientSecret');
        setClientSecret(decodeSecret(data.clientSecret));
      } else {
        throw new Error('Aucun clientSecret reçu');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Erreur lors du chargement du paiement');
    } finally {
      setIsLoading(false);
    }
  };

  // Un seul effet: attendre que promoCodeChecked soit true, puis fetch
  useEffect(() => {
    if (!promoCodeChecked) return;
    
    // Si on a un code promo, fetch avec le code
    if (promoCode) {
      fetchCheckoutSession(promoCode);
    } else if (preloadedSecret) {
      // Pas de code promo et on a un secret préchargé, l'utiliser
      setClientSecret(decodeSecret(preloadedSecret));
      setIsLoading(false);
    } else {
      // Pas de code promo et pas de préchargé, fetch sans code
      fetchCheckoutSession(null);
    }
  }, [promoCodeChecked, promoCode, creatorId]);

  const handlePromoCodeValidated = (code: string | null, discountInfo: { type: 'percentage' | 'fixed'; value: number } | null) => {
    console.log('[EmbeddedCheckout] Promo code validated:', code, discountInfo);
    setDiscount(discountInfo);
    setPromoCode(code);
    
    // Si le code promo n'a pas encore été vérifié, marquer comme vérifié
    if (!promoCodeChecked) {
      setPromoCodeChecked(true);
    } else if (code !== promoCode) {
      // Si le code change, refetch
      setClientSecret('');
      setIsLoading(true);
    }
  };

  // Callback appelé par PromoCodeInput quand il a fini de vérifier localStorage
  const handlePromoCodeCheckComplete = () => {
    if (!promoCodeChecked) {
      setPromoCodeChecked(true);
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
          onInitialCheckComplete={handlePromoCodeCheckComplete}
        />
      </div>

      {/* Checkout form */}
      <div className="min-h-[500px]">
        {!clientSecret || isLoading ? (
          <div className="flex items-center justify-center p-8 h-[500px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <EmbeddedCheckoutProvider key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
            <StripeEmbeddedCheckout className="w-full" />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );
};
