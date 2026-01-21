import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook pour la protection anti-capture du contenu
 * Protection renforcée contre le partage non autorisé
 * 
 * IMPORTANT: Ce hook ne bloque PAS les clics normaux sur les boutons.
 * Il protège uniquement contre:
 * - Print Screen, Ctrl+S, Ctrl+P
 * - Clic droit sur les médias
 * - Drag & drop des images
 * - Perte de focus (flou du contenu)
 */
export const useContentProtection = (enabled: boolean = true) => {
  const lastWarningTimeRef = useRef(0);
  const [isBlurred, setIsBlurred] = useState(false);
  const isDialogOpenRef = useRef(false);

  /**
   * Afficher un avertissement avec rate limiting (30 secondes minimum entre les messages)
   */
  const showWarning = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastWarningTimeRef.current > 30000) {
      toast.warning(message);
      lastWarningTimeRef.current = now;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Observer les changements de dialogues pour désactiver le flou
    const observeDialogs = () => {
      const hasOpenDialog = document.querySelector('[role="dialog"][data-state="open"]') !== null ||
                           document.querySelector('[data-radix-portal]') !== null;
      isDialogOpenRef.current = hasOpenDialog;
    };

    // MutationObserver pour détecter l'ouverture/fermeture de dialogues
    const observer = new MutationObserver(observeDialogs);
    observer.observe(document.body, { childList: true, subtree: true });

    // Bloquer les raccourcis clavier de capture
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ne pas interférer si un dialogue est ouvert
      if (isDialogOpenRef.current) return;
      
      // Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showWarning('Les captures d\'écran sont désactivées pour protéger le contenu');
        return false;
      }

      // Ctrl+S / Cmd+S (Enregistrer) - sauf dans les champs de saisie
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const target = e.target as HTMLElement;
        if (target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          return false;
        }
      }

      // Ctrl+P / Cmd+P (Imprimer)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showWarning('L\'impression est désactivée pour protéger le contenu');
        return false;
      }

      // Ctrl+Shift+S / Cmd+Shift+S (Capture Firefox/Chrome)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        return false;
      }

      // NE PAS bloquer F12/DevTools en dev - cela empêche le debugging
    };

    // Désactiver le menu contextuel (clic droit) sur les médias UNIQUEMENT
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // JAMAIS bloquer sur les éléments interactifs
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-portal]') ||
        target.closest('[data-radix-collection-item]') ||
        target.closest('form')
      ) {
        return; // Laisser passer le clic droit
      }

      // Bloquer uniquement sur les médias et éléments protégés
      const isMedia = target.tagName === 'IMG' || target.tagName === 'VIDEO';
      const isInsideMedia = !!target.closest('video') || !!target.closest('img');
      const isProtected = target.classList?.contains('protected-content') || 
                         !!target.closest('.protected-content');

      if (isMedia || isInsideMedia || isProtected) {
        e.preventDefault();
        showWarning('Le contenu est protégé contre le téléchargement');
      }
    };

    // Bloquer le glisser-déposer d'images UNIQUEMENT
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ne bloquer que les médias
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        e.preventDefault();
      }
    };

    // Détection de perte de focus - DÉSACTIVÉ si dialogue ouvert
    const handleVisibilityChange = () => {
      // Ne pas flouter si un dialogue Stripe/Radix est ouvert
      if (isDialogOpenRef.current) return;
      
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        setTimeout(() => setIsBlurred(false), 300);
      }
    };

    // Blur de fenêtre - DÉSACTIVÉ si dialogue ouvert
    const handleWindowBlur = () => {
      // L'iframe Stripe peut déclencher un blur, ne pas réagir si dialogue ouvert
      if (isDialogOpenRef.current) return;
      setIsBlurred(true);
    };

    const handleWindowFocus = () => {
      setTimeout(() => setIsBlurred(false), 200);
    };

    // Bloquer la copie d'images (pas le texte)
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection && selection.toString().length === 0) {
        const target = e.target as HTMLElement;
        if (target?.closest('.protected-content') || target?.tagName === 'IMG' || target?.tagName === 'VIDEO') {
          e.preventDefault();
          showWarning('La copie de ce contenu est interdite');
        }
      }
    };

    // Attacher les événements avec capture: false pour permettre la propagation normale
    document.addEventListener('keydown', handleKeyDown, { capture: false });
    document.addEventListener('contextmenu', handleContextMenu, { capture: false });
    document.addEventListener('dragstart', handleDragStart, { capture: false });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy, { capture: false });
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [enabled, showWarning]);

  return { isBlurred };
};