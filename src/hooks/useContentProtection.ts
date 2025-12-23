import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook pour la protection anti-capture du contenu
 * Version simplifiée - protection passive sans faux positifs
 */
export const useContentProtection = (enabled: boolean = true) => {
  const lastWarningTimeRef = useRef(0);

  /**
   * Afficher un avertissement avec rate limiting (30 secondes minimum entre les messages)
   */
  const showWarning = useCallback((message: string) => {
    const now = Date.now();
    // 30 secondes minimum entre les avertissements
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
        return false;
      }

      // Ctrl+Shift+S / Cmd+Shift+S (Capture Firefox/Chrome)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
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

      const isMedia = el?.tagName === 'IMG' || el?.tagName === 'VIDEO';
      const isInsideMedia = el instanceof Element && (!!el.closest('video') || !!el.closest('img'));
      const isProtected = !!el?.classList && el.classList.contains('protected-content');

      if (isMedia || isInsideMedia || isProtected) {
        e.preventDefault();
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
        return false;
      }
    };

    // Attacher les événements
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [enabled, showWarning]);
};