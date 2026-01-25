import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { useCsrfToken } from '@/hooks/useCsrfToken';

interface EmbeddedCheckoutProps {
  creatorId: string;
  onClose: () => void;
  preloadedSecret?: string | null;
}

export const EmbeddedCheckout = ({ creatorId, onClose }: EmbeddedCheckoutProps) => {
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { generateToken } = useCsrfToken();

  const fetchCheckoutSession = useCallback(async (referralCode?: string | null) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('[EmbeddedCheckout] Fetching checkout session for creator:', creatorId, 'with referralCode:', referralCode);
      
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
      
      const { data, error: fnError } = await supabase.functions.invoke('create-creator-checkout', {
        body: { 
          creatorId,
          referralCode: referralCode || undefined,
          csrfToken
        },
      });

      if (fnError) throw fnError;
      
      if (data?.url) {
        // Redirection directe vers Stripe Checkout
        console.log('[EmbeddedCheckout] Redirecting to Stripe:', data.url);
        window.location.href = data.url;
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (err: any) {
      console.error('[EmbeddedCheckout] Checkout error:', err);
      setError(err.message || 'Erreur lors du chargement du paiement');
      setIsLoading(false);
    }
  }, [creatorId, generateToken]);

  // Initialisation au montage - vérifier le code promo sauvegardé
  useEffect(() => {
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
    
    if (savedPromoCode) {
      setPromoCode(savedPromoCode);
    }
  }, [creatorId]);

  const handlePromoCodeValidated = useCallback((code: string | null) => {
    console.log('[EmbeddedCheckout] Promo code validated:', code);
    setPromoCode(code);
  }, []);

  const handleSubscribe = () => {
    fetchCheckoutSession(promoCode);
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
    <div className="w-full space-y-4">
      {/* Promo code input */}
      <div className="p-4 border-b">
        <PromoCodeInput
          creatorId={creatorId}
          onCodeValidated={handlePromoCodeValidated}
        />
      </div>

      {/* Subscribe button */}
      <div className="p-4">
        <button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Redirection vers le paiement...
            </div>
          ) : (
            "Continuer vers le paiement"
          )}
        </button>
      </div>
    </div>
  );
};
