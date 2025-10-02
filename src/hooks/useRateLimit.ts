/**
 * Hook personnalisé pour implémenter le rate limiting côté client
 * Protège contre les abus et les requêtes excessives
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Configuration du rate limiter
 */
interface RateLimitConfig {
  /** Nombre maximum de requêtes autorisées */
  maxRequests: number;
  /** Fenêtre de temps en millisecondes */
  windowMs: number;
  /** Message d'erreur personnalisé */
  message?: string;
  /** Callback appelé quand la limite est atteinte */
  onLimitReached?: () => void;
}

/**
 * Résultat du rate limiter
 */
interface RateLimitResult {
  /** Fonction pour vérifier si une action est autorisée */
  checkLimit: () => boolean;
  /** Nombre de requêtes restantes */
  remaining: number;
  /** Timestamp de la prochaine fenêtre */
  resetAt: number;
  /** Réinitialiser le compteur manuellement */
  reset: () => void;
}

/**
 * Hook pour implémenter le rate limiting
 * 
 * @param config - Configuration du rate limiter
 * @returns Objet contenant les fonctions et états du rate limiter
 * 
 * @example
 * ```tsx
 * // Limiter à 5 connexions par minute
 * const { checkLimit, remaining } = useRateLimit({
 *   maxRequests: 5,
 *   windowMs: 60000, // 1 minute
 *   message: "Trop de tentatives. Veuillez patienter."
 * });
 * 
 * const handleLogin = async () => {
 *   if (!checkLimit()) {
 *     return; // Bloqué par rate limit
 *   }
 *   
 *   // Continuer avec la connexion
 *   await signIn(email, password);
 * };
 * ```
 */
export const useRateLimit = (config: RateLimitConfig): RateLimitResult => {
  const {
    maxRequests,
    windowMs,
    message = 'Trop de requêtes. Veuillez patienter quelques instants.',
    onLimitReached,
  } = config;

  // Stocker les timestamps des requêtes
  const requestTimestamps = useRef<number[]>([]);
  const [remaining, setRemaining] = useState(maxRequests);
  const [resetAt, setResetAt] = useState(Date.now() + windowMs);

  /**
   * Nettoyer les vieux timestamps
   */
  const cleanOldTimestamps = useCallback(() => {
    const now = Date.now();
    requestTimestamps.current = requestTimestamps.current.filter(
      (timestamp) => now - timestamp < windowMs
    );
  }, [windowMs]);

  /**
   * Vérifier si une nouvelle requête est autorisée
   */
  const checkLimit = useCallback((): boolean => {
    cleanOldTimestamps();

    const now = Date.now();

    // Vérifier si on a dépassé la limite
    if (requestTimestamps.current.length >= maxRequests) {
      const oldestTimestamp = requestTimestamps.current[0];
      const timeUntilReset = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

      // Afficher un message d'erreur
      toast.error(`${message} (${timeUntilReset}s)`);
      
      // Callback personnalisé
      onLimitReached?.();

      return false;
    }

    // Ajouter le timestamp actuel
    requestTimestamps.current.push(now);

    // Mettre à jour les états
    setRemaining(maxRequests - requestTimestamps.current.length);
    setResetAt(now + windowMs);

    return true;
  }, [maxRequests, windowMs, message, onLimitReached, cleanOldTimestamps]);

  /**
   * Réinitialiser manuellement le compteur
   */
  const reset = useCallback(() => {
    requestTimestamps.current = [];
    setRemaining(maxRequests);
    setResetAt(Date.now() + windowMs);
  }, [maxRequests, windowMs]);

  /**
   * Nettoyer périodiquement les vieux timestamps
   */
  useEffect(() => {
    const interval = setInterval(() => {
      cleanOldTimestamps();
      setRemaining(maxRequests - requestTimestamps.current.length);
    }, 1000);

    return () => clearInterval(interval);
  }, [maxRequests, cleanOldTimestamps]);

  return {
    checkLimit,
    remaining,
    resetAt,
    reset,
  };
};

/**
 * Rate limiter spécifique pour l'authentification
 * Configuration prédéfinie pour protéger contre les attaques par force brute
 */
export const useAuthRateLimit = () => {
  return useRateLimit({
    maxRequests: 5, // 5 tentatives
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  });
};

/**
 * Rate limiter pour les recherches
 * Évite les requêtes excessives vers la base de données
 */
export const useSearchRateLimit = () => {
  return useRateLimit({
    maxRequests: 30, // 30 recherches
    windowMs: 60 * 1000, // 1 minute
    message: 'Trop de recherches. Veuillez ralentir.',
  });
};

/**
 * Rate limiter pour les uploads
 * Protège contre les uploads massifs
 */
export const useUploadRateLimit = () => {
  return useRateLimit({
    maxRequests: 10, // 10 uploads
    windowMs: 60 * 60 * 1000, // 1 heure
    message: 'Limite d\'uploads atteinte. Veuillez patienter une heure.',
  });
};

/**
 * Rate limiter pour les messages
 * Évite le spam de messages
 */
export const useMessageRateLimit = () => {
  return useRateLimit({
    maxRequests: 20, // 20 messages
    windowMs: 60 * 1000, // 1 minute
    message: 'Trop de messages envoyés. Veuillez ralentir.',
  });
};

export default useRateLimit;
