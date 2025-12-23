import { useEffect, useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface EmbeddedCheckoutProps {
  creatorId: string;
  onClose: () => void;
  preloadedSecret?: string | null;
}

export const EmbeddedCheckout = ({ creatorId, onClose, preloadedSecret }: EmbeddedCheckoutProps) => {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    // Si déjà préchargé, pas besoin de refetch
    if (preloadedSecret) {
      setClientSecret(decodeSecret(preloadedSecret));
      return;
    }

    const fetchClientSecret = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-creator-checkout', {
          body: { creatorId },
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
      }
    };

    fetchClientSecret();
  }, [creatorId, preloadedSecret]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <button onClick={onClose} className="text-primary underline">Fermer</button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[500px]">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <StripeEmbeddedCheckout className="w-full" />
      </EmbeddedCheckoutProvider>
    </div>
  );
};
