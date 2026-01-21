import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook pour la protection anti-capture du contenu
 * Protection renforcée contre le partage non autorisé
 */
export const useContentProtection = (enabled: boolean = true) => {
  const lastWarningTimeRef = useRef(0);
  const [isBlurred, setIsBlurred] = useState(false);

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

    // Bloquer les raccourcis clavier de capture
    const handleKeyDown = (e: KeyboardEvent) => {
      // Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showWarning('Les captures d\'écran sont désactivées pour protéger le contenu');
        return false;
      }

      // Ctrl+S / Cmd+S (Enregistrer)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return false;
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

      // Ctrl+Shift+I / F12 (DevTools)
      if ((e.ctrlKey && e.shiftKey && e.key === 'i') || e.key === 'F12') {
        e.preventDefault();
        showWarning('Les outils de développement sont restreints');
        return false;
      }

      // Ctrl+U (View source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    // Désactiver le menu contextuel (clic droit) sur les médias
    const handleContextMenu = (e: MouseEvent) => {
      const targetNode = e.target as Node | null;
      if (!targetNode) return;

      let el: HTMLElement | null = null;
      if (targetNode instanceof HTMLElement) el = targetNode;
      else if ((targetNode as any)?.parentElement) el = (targetNode as any).parentElement as HTMLElement;

      // Ne pas bloquer les boutons et les éléments interactifs
      if (el?.tagName === 'BUTTON' || el?.closest('button') || el?.closest('[role="dialog"]') || el?.closest('[data-radix-portal]')) {
        return;
      }

      const isMedia = el?.tagName === 'IMG' || el?.tagName === 'VIDEO';
      const isInsideMedia = el instanceof Element && (!!el.closest('video') || !!el.closest('img'));
      const isProtected = !!el?.classList && el.classList.contains('protected-content');

      if (isMedia || isInsideMedia || isProtected) {
        e.preventDefault();
        showWarning('Le contenu est protégé contre le téléchargement');
        return false;
      }
    };

    // Bloquer le glisser-déposer d'images
    const handleDragStart = (e: DragEvent) => {
      const targetNode = e.target as Node | null;
      if (!targetNode) return;

      let el: HTMLElement | null = null;
      if (targetNode instanceof HTMLElement) el = targetNode;
      else if ((targetNode as any)?.parentElement) el = (targetNode as any).parentElement as HTMLElement;

      if (el?.tagName === 'IMG' || el?.tagName === 'VIDEO' || el?.classList?.contains('protected-content')) {
        e.preventDefault();
        showWarning('Le glisser-déposer est désactivé');
        return false;
      }
    };

    // Détection de perte de focus (changement d'onglet, alt-tab, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      } else {
        // Petit délai avant de retirer le flou pour éviter les captures rapides
        setTimeout(() => setIsBlurred(false), 300);
      }
    };

    // Détection de blur de la fenêtre
    const handleWindowBlur = () => {
      setIsBlurred(true);
    };

    const handleWindowFocus = () => {
      setTimeout(() => setIsBlurred(false), 200);
    };

    // Bloquer la copie d'images
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection && selection.toString().length === 0) {
        // Pas de texte sélectionné, peut-être une tentative de copier une image
        const target = e.target as HTMLElement;
        if (target?.closest('.protected-content') || target?.tagName === 'IMG' || target?.tagName === 'VIDEO') {
          e.preventDefault();
          showWarning('La copie de ce contenu est interdite');
        }
      }
    };

    // Attacher les événements
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup
    return () => {
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