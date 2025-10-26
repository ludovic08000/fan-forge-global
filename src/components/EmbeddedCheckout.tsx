import { useEffect, useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout as StripeEmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface EmbeddedCheckoutProps {
  creatorId: string;
  onClose: () => void;
}

export const EmbeddedCheckout = ({ creatorId, onClose }: EmbeddedCheckoutProps) => {
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
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
          setClientSecret(data.clientSecret);
        }
      } catch (error: any) {
        console.error('Checkout error:', error);
        onClose();
      }
    };

    fetchClientSecret();
  }, [creatorId, onClose]);

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <StripeEmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
};
