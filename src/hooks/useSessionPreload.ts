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
let sessionVersion = 0; // incremented on auth state change

/**
 * Obtenir la session de manière synchrone si disponible
 */
export const getSessionSync = (): Session | null => cachedSession;
export const getSessionVersion = (): number => sessionVersion;

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
      // Reset promise so next getSessionAsync() uses fresh session
      sessionPromise = null;
      sessionVersion++;
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, isAuthenticated: !!session };
};

/**
 * Obtenir la session de manière async (toujours fraîche)
 * Appelle supabase.auth.getSession() qui gère le refresh automatique
 */
export const getSessionAsync = async (): Promise<Session | null> => {
  // If cached session exists and token is not expired (30s margin), use it
  if (cachedSession?.expires_at) {
    const expiresAtMs = cachedSession.expires_at * 1000;
    if (expiresAtMs > Date.now() + 30000) {
      return cachedSession;
    }
  }
  
  // Otherwise fetch fresh session (handles token refresh)
  try {
    const { data } = await supabase.auth.getSession();
    cachedSession = data.session;
    if (data.session) {
      sessionVersion++;
    }
    isInitialized = true;
    return cachedSession;
  } catch (err) {
    console.warn('[getSessionAsync] Error:', err);
    return null;
  }
};
