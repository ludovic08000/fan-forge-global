import { useEffect, useState, useRef } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { PromoCodeInput } from '@/components/PromoCodeInput';
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
  const [isLoading, setIsLoading] = useState(true);
  const { generateToken } = useCsrfToken();
  const hasFetched = useRef(false);

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
      
      let csrfToken = await generateToken();
      
      if (!csrfToken) {
        await new Promise(resolve => setTimeout(resolve, 500));
        csrfToken = await generateToken();
      }
      
      if (!csrfToken) {
        throw new Error('Impossible de générer le token de sécurité. Veuillez vous reconnecter.');
      }
      
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      const { data, error } = await supabase.functions.invoke('create-creator-checkout', {
        body: { 
          creatorId,
          referralCode: referralCode || undefined,
          csrfToken
        },
      });

      if (error) throw error;
      if (data.clientSecret) {
        console.log('[EmbeddedCheckout] Got clientSecret');
        setClientSecret(decodeSecret(data.clientSecret));
      } else if (data.error) {
        throw new Error(data.error);
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

  // Initialisation unique au montage
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    // Vérifier s'il y a un code promo sauvegardé
    const savedCode = localStorage.getItem('crub_promo_code');
    let savedPromoCode: string | null = null;
    
    if (savedCode) {
      try {
        const parsed = JSON.parse(savedCode);
        if (parsed.creatorId === creatorId && parsed.code) {
          savedPromoCode = parsed.code;
        }
      } catch {
        localStorage.removeItem('crub_promo_code');
      }
    }
    
    // Si code promo sauvegardé, on doit fetch avec le code
    if (savedPromoCode) {
      console.log('[EmbeddedCheckout] Found saved promo code, fetching with it');
      setPromoCode(savedPromoCode);
      fetchCheckoutSession(savedPromoCode);
    } else if (preloadedSecret) {
      // Pas de code promo, utiliser le secret préchargé
      console.log('[EmbeddedCheckout] Using preloaded secret');
      setClientSecret(decodeSecret(preloadedSecret));
      setIsLoading(false);
    } else {
      // Pas de préchargé, fetch maintenant
      console.log('[EmbeddedCheckout] No preloaded secret, fetching now');
      fetchCheckoutSession(null);
    }
  }, []); // Dépendances vides = exécution unique

  const handlePromoCodeValidated = (code: string | null, discountInfo: { type: 'percentage' | 'fixed'; value: number } | null) => {
    console.log('[EmbeddedCheckout] Promo code validated:', code, discountInfo);
    
    // Si le code change, refetch la session checkout
    if (code !== promoCode && code) {
      setPromoCode(code);
      setClientSecret('');
      fetchCheckoutSession(code);
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
