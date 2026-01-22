import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecureEmailActionResult {
  success: boolean;
  message: string;
}

interface UseSecureEmailActionReturn {
  sendAction: (action: 'password_reset' | 'verify_email', email: string, turnstileToken?: string) => Promise<SecureEmailActionResult>;
  isLoading: boolean;
  lastMessage: string | null;
}

/**
 * Hook sécurisé pour les actions email (reset password, verify email)
 * 
 * Caractéristiques de sécurité:
 * - Message identique dans tous les cas (ne révèle jamais si un compte existe)
 * - Rate limiting côté serveur
 * - Protection anti-bot via Turnstile
 * - Tokens sécurisés avec expiration
 * - Protection contre les timing attacks
 */
export const useSecureEmailAction = (): UseSecureEmailActionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const sendAction = useCallback(async (
    action: 'password_reset' | 'verify_email',
    email: string,
    turnstileToken?: string
  ): Promise<SecureEmailActionResult> => {
    setIsLoading(true);
    setLastMessage(null);

    try {
      // Validation côté client (mais le serveur revalidera)
      const normalizedEmail = email.toLowerCase().trim();
      
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        // Même message générique pour ne pas révéler les erreurs de validation
        const genericMessage = "Si cette adresse email est associée à un compte, vous recevrez un email avec les instructions.";
        setLastMessage(genericMessage);
        return { success: true, message: genericMessage };
      }

      const { data, error } = await supabase.functions.invoke('secure-email-action', {
        body: {
          action,
          email: normalizedEmail,
          turnstileToken,
        },
      });

      // Le serveur retourne toujours success: true avec un message générique
      const message = data?.message || "Si cette adresse email est associée à un compte, vous recevrez un email avec les instructions.";
      setLastMessage(message);
      
      return { success: true, message };
    } catch (error) {
      // Même en cas d'erreur réseau, afficher le message générique
      console.error('Secure email action error:', error);
      const genericMessage = "Si cette adresse email est associée à un compte, vous recevrez un email avec les instructions.";
      setLastMessage(genericMessage);
      return { success: true, message: genericMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendAction,
    isLoading,
    lastMessage,
  };
};
