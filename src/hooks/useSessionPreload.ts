/**
 * Hook optimisé pour précharger la session Supabase une seule fois
 * Évite les appels répétés à getSession() dans chaque composant
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

// Singleton pour la session - évite les appels répétés
let cachedSession: Session | null = null;
let sessionPromise: Promise<Session | null> | null = null;
let isInitialized = false;

/**
 * Obtenir la session de manière synchrone si disponible
 */
export const getSessionSync = (): Session | null => cachedSession;

/**
 * Précharger la session (appelé une fois au démarrage)
 */
export const preloadSession = async (): Promise<Session | null> => {
  if (sessionPromise) return sessionPromise;
  
  sessionPromise = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      cachedSession = data.session;
      isInitialized = true;
      return cachedSession;
    } catch (err) {
      console.warn('[preloadSession] Error:', err);
      isInitialized = true;
      return null;
    }
  })();
  
  return sessionPromise;
};

/**
 * Hook pour utiliser la session préchargée
 */
export const usePreloadedSession = () => {
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [loading, setLoading] = useState(!isInitialized);

  useEffect(() => {
    // Si pas encore initialisé, charger
    if (!isInitialized) {
      preloadSession().then((s) => {
        setSession(s);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    // Écouter les changements (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      cachedSession = newSession;
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, isAuthenticated: !!session };
};

/**
 * Obtenir la session de manière async (avec cache)
 */
export const getSessionAsync = async (): Promise<Session | null> => {
  if (cachedSession) return cachedSession;
  return preloadSession();
};
