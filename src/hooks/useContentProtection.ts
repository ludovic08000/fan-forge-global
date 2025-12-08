import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Liste des extensions de capture d'écran connues à détecter
 */
const KNOWN_SCREENSHOT_EXTENSIONS = [
  // Extensions Chrome populaires
  'nimbus', 'lightshot', 'awesome-screenshot', 'fireshot', 'screencastify',
  'loom', 'vidyard', 'droplr', 'cloudup', 'gyazo', 'monosnap',
  'snagit', 'greenshot', 'sharex', 'screenpresso', 'screenshot',
  'capture', 'screen-capture', 'full-page-screen', 'webpage-screenshot',
  'snipping', 'clipular', 'pageshot', 'screengrab', 'webshot'
];

/**
 * Patterns CSS/DOM injectés par les extensions de capture
 */
const SUSPICIOUS_DOM_PATTERNS = [
  '[class*="screenshot"]',
  '[class*="screen-capture"]',
  '[class*="nimbus"]',
  '[class*="lightshot"]',
  '[class*="fireshot"]',
  '[class*="awesome-screenshot"]',
  '[id*="screenshot"]',
  '[id*="screen-capture"]',
  '[data-screenshot]',
  '[data-capture]',
  'iframe[src*="screenshot"]',
  'iframe[src*="capture"]',
];

/**
 * Hook pour la protection anti-capture du contenu
 * Inclut la détection des extensions de capture d'écran
 */
export const useContentProtection = (enabled: boolean = true) => {
  const extensionDetectedRef = useRef(false);
  const lastWarningTimeRef = useRef(0);

  /**
   * Afficher un avertissement avec rate limiting
   */
  const showWarning = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastWarningTimeRef.current > 3000) {
      toast.warning(message);
      lastWarningTimeRef.current = now;
    }
  }, []);

  /**
   * Détecter les éléments DOM suspects injectés par les extensions
   */
  const detectSuspiciousDOMElements = useCallback(() => {
    for (const pattern of SUSPICIOUS_DOM_PATTERNS) {
      try {
        const elements = document.querySelectorAll(pattern);
        if (elements.length > 0) {
          console.warn('Élément suspect détecté:', pattern);
          return true;
        }
      } catch (e) {
        // Ignorer les erreurs de sélecteur invalide
      }
    }
    return false;
  }, []);

  /**
   * Détecter les scripts d'extensions connus
   */
  const detectExtensionScripts = useCallback(() => {
    // Vérifier les scripts injectés
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = (script as HTMLScriptElement).src.toLowerCase();
      for (const ext of KNOWN_SCREENSHOT_EXTENSIONS) {
        if (src.includes(ext)) {
          console.warn('Extension de capture détectée via script:', ext);
          return true;
        }
      }
    }

    // Vérifier les styles injectés
    const styles = document.querySelectorAll('link[href], style');
    for (const style of styles) {
      const href = (style as HTMLLinkElement).href?.toLowerCase() || '';
      const textContent = style.textContent?.toLowerCase() || '';
      for (const ext of KNOWN_SCREENSHOT_EXTENSIONS) {
        if (href.includes(ext) || textContent.includes(ext)) {
          console.warn('Extension de capture détectée via style:', ext);
          return true;
        }
      }
    }

    return false;
  }, []);

  /**
   * Détecter l'API Screen Capture
   */
  const monitorScreenCaptureAPI = useCallback(() => {
    // Intercepter getDisplayMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      
      navigator.mediaDevices.getDisplayMedia = async function(constraints) {
        showWarning('La capture d\'écran est détectée. Le contenu peut être protégé.');
        console.warn('Tentative de capture d\'écran via getDisplayMedia');
        
        // On peut choisir de bloquer complètement ou juste avertir
        // Pour l'instant, on avertit mais on laisse passer pour ne pas casser d'autres fonctionnalités
        return originalGetDisplayMedia(constraints);
      };
    }
  }, [showWarning]);

  /**
   * Observer les mutations DOM pour détecter les injections d'extensions
   */
  const setupMutationObserver = useCallback(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Vérifier les nouveaux nœuds ajoutés
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            const tagName = node.tagName?.toLowerCase();
            const className = node.className?.toString().toLowerCase() || '';
            const id = node.id?.toLowerCase() || '';
            
            // Vérifier si c'est un élément suspect
            for (const ext of KNOWN_SCREENSHOT_EXTENSIONS) {
              if (className.includes(ext) || id.includes(ext)) {
                if (!extensionDetectedRef.current) {
                  extensionDetectedRef.current = true;
                  showWarning('Une extension de capture d\'écran a été détectée. Le contenu est protégé.');
                  
                  // Ajouter une classe de protection supplémentaire
                  document.body.classList.add('screenshot-extension-detected');
                }
                return;
              }
            }

            // Détecter les overlays de capture (souvent en position fixed avec z-index élevé)
            if (tagName === 'div' || tagName === 'canvas') {
              const style = window.getComputedStyle(node);
              const zIndex = parseInt(style.zIndex) || 0;
              const position = style.position;
              
              if (position === 'fixed' && zIndex > 999999) {
                console.warn('Overlay suspect détecté avec z-index élevé');
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'style']
    });

    return observer;
  }, [showWarning]);

  /**
   * Détecter la perte de focus (utilisateur utilisant un outil externe)
   */
  const monitorVisibilityChange = useCallback(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // L'utilisateur a quitté la page - potentiellement pour utiliser un outil de capture
        console.debug('Page masquée - surveillance active');
      }
    };

    const handleBlur = () => {
      // Fenêtre a perdu le focus
      console.debug('Fenêtre perdue - potentielle capture externe');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Détection initiale
    if (detectSuspiciousDOMElements() || detectExtensionScripts()) {
      extensionDetectedRef.current = true;
      showWarning('Une extension de capture d\'écran a été détectée. Le contenu est protégé.');
      document.body.classList.add('screenshot-extension-detected');
    }

    // Configurer la surveillance
    monitorScreenCaptureAPI();
    const cleanupVisibility = monitorVisibilityChange();
    const mutationObserver = setupMutationObserver();

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
        showWarning('L\'enregistrement est désactivé pour protéger le contenu');
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
        showWarning('Les captures d\'écran sont désactivées pour protéger le contenu');
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }

      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Win+Shift+S (Windows Snipping Tool)
      if (e.shiftKey && e.key === 'S' && (e.metaKey || e.getModifierState('OS'))) {
        e.preventDefault();
        showWarning('L\'outil de capture Windows est détecté');
        return false;
      }
    };

    // Désactiver le menu contextuel (clic droit)
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
        showWarning('Le clic droit est désactivé sur ce contenu');
        return false;
      }
    };

    // Bloquer la sélection de texte sur les contenus protégés
    const handleSelectStart = (e: Event) => {
      const targetNode = e.target as Node | null;
      if (!targetNode) return;

      let el: HTMLElement | null = null;
      if (targetNode instanceof HTMLElement) el = targetNode;
      else if ((targetNode as any)?.parentElement) el = (targetNode as any).parentElement as HTMLElement;

      if (el?.classList?.contains('protected-content')) {
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
          showWarning('La copie est désactivée sur ce contenu');
          return false;
        }
      }
    };

    // Attacher les événements
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopy);

    // Détection DevTools périodique (silencieuse)
    const devToolsInterval = setInterval(() => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        console.clear();
      }
    }, 1000);

    // Vérification périodique des extensions
    const extensionCheckInterval = setInterval(() => {
      if (!extensionDetectedRef.current) {
        if (detectSuspiciousDOMElements() || detectExtensionScripts()) {
          extensionDetectedRef.current = true;
          showWarning('Une extension de capture d\'écran a été détectée.');
          document.body.classList.add('screenshot-extension-detected');
        }
      }
    }, 5000);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
      cleanupVisibility();
      mutationObserver.disconnect();
      clearInterval(devToolsInterval);
      clearInterval(extensionCheckInterval);
      document.body.classList.remove('screenshot-extension-detected');
    };
  }, [enabled, detectSuspiciousDOMElements, detectExtensionScripts, monitorScreenCaptureAPI, monitorVisibilityChange, setupMutationObserver, showWarning]);
};