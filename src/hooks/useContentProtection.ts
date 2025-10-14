import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook pour la protection anti-capture du contenu
 * IMPORTANT: Cette protection est basique et peut être contournée par des utilisateurs techniques
 */
export const useContentProtection = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Bloquer les raccourcis clavier de capture
    const handleKeyDown = (e: KeyboardEvent) => {
      // Print Screen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        toast.error('Les captures d\'écran sont désactivées pour protéger le contenu');
        return false;
      }

      // Ctrl+S / Cmd+S (Enregistrer)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        toast.error('L\'enregistrement est désactivé pour protéger le contenu');
        return false;
      }

      // Ctrl+P / Cmd+P (Imprimer)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        toast.error('L\'impression est désactivée pour protéger le contenu');
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        toast.warning('Les outils de développement sont déconseillés');
        return false;
      }

      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        toast.warning('Les outils de développement sont déconseillés');
        return false;
      }
    };

    // Désactiver le menu contextuel (clic droit)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Bloquer sur les images, vidéos et leurs conteneurs
      if (
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.closest('video') ||
        target.closest('img') ||
        target.classList.contains('protected-content')
      ) {
        e.preventDefault();
        toast.error('Le clic droit est désactivé sur ce contenu');
        return false;
      }
    };

    // Détection basique de l'ouverture des DevTools (silencieuse)
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        console.clear();
        // Protection silencieuse - pas de notification
      }
    };

    // Bloquer la sélection de texte sur les contenus protégés
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('protected-content')) {
        e.preventDefault();
        return false;
      }
    };

    // Bloquer le glisser-déposer d'images
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.classList.contains('protected-content')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Attacher les événements
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Détection DevTools périodique
    const devToolsInterval = setInterval(detectDevTools, 1000);

    // Bloquer le copy-paste sur le contenu protégé
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === 1 
          ? container as HTMLElement 
          : container.parentElement;
        
        if (element?.classList.contains('protected-content')) {
          e.preventDefault();
          toast.error('La copie est désactivée sur ce contenu');
          return false;
        }
      }
    };

    document.addEventListener('copy', handleCopy);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
      clearInterval(devToolsInterval);
    };
  }, [enabled]);
};
