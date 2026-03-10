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
  // If cached session exists and token is not expired (60s margin), use it
  if (cachedSession?.expires_at) {
    const expiresAtMs = cachedSession.expires_at * 1000;
    if (expiresAtMs > Date.now() + 60000) {
      return cachedSession;
    }
    
    // Token is expired or near-expiry — force refresh
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        cachedSession = data.session;
        sessionVersion++;
        isInitialized = true;
        return cachedSession;
      }
    } catch (err) {
      console.warn('[getSessionAsync] refreshSession failed:', err);
    }
  }
  
  // No cached session or refresh failed — try getSession
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Verify token is actually valid (not expired)
      const expiresAtMs = (data.session.expires_at || 0) * 1000;
      if (expiresAtMs <= Date.now() + 30000) {
        // Token from storage is expired, force refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          cachedSession = refreshData.session;
          sessionVersion++;
          isInitialized = true;
          return cachedSession;
        }
        // Refresh failed — user needs to re-login
        cachedSession = null;
        isInitialized = true;
        return null;
      }
      cachedSession = data.session;
      sessionVersion++;
    }
    isInitialized = true;
    return cachedSession;
  } catch (err) {
    console.warn('[getSessionAsync] Error:', err);
    return null;
  }
};
