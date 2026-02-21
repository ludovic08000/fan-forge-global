import { useEffect, useState, useCallback } from 'react';

/**
 * Hook pour la protection anti-capture du contenu
 * - Détecte la perte de focus (changement d'onglet/fenêtre) et floute le contenu
 * - Bloque les raccourcis clavier de capture (PrintScreen, etc.)
 * - Bloque le clic droit sur les médias
 */
export const useContentProtection = (enabled: boolean = true) => {
  const [isBlurred, setIsBlurred] = useState(false);

  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    if (document.hidden) {
      setIsBlurred(true);
    } else {
      // Petit délai avant de retirer le flou pour éviter les captures rapides
      setTimeout(() => setIsBlurred(false), 300);
    }
  }, [enabled]);

  const handleWindowBlur = useCallback(() => {
    if (!enabled) return;
    setIsBlurred(true);
  }, [enabled]);

  const handleWindowFocus = useCallback(() => {
    if (!enabled) return;
    setTimeout(() => setIsBlurred(false), 300);
  }, [enabled]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Bloquer PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      setIsBlurred(true);
      setTimeout(() => setIsBlurred(false), 2000);
      return;
    }

    // Bloquer Ctrl+Shift+I (DevTools), Ctrl+U (source), Ctrl+S (save)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      return;
    }

    // Bloquer F12
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsBlurred(false);
      return;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleVisibilityChange, handleWindowBlur, handleWindowFocus, handleKeyDown]);

  return { isBlurred };
};
