import { useEffect } from 'react';

/**
 * Hook qui détecte les informations du navigateur et de l'écran
 * et applique des classes CSS dynamiques sur <html> pour adapter le site automatiquement.
 * 
 * Classes appliquées:
 * - screen-mobile / screen-tablet / screen-laptop / screen-desktop
 * - orientation-portrait / orientation-landscape
 * - browser-safari / browser-chrome / browser-edge / browser-firefox
 * - os-ios / os-android / os-macos / os-windows
 * - touch-device / pointer-device
 * - high-dpi (retina)
 * - standalone (PWA installée)
 */
export function useAdaptiveLayout() {
  useEffect(() => {
    const root = document.documentElement;

    const detectAndApply = () => {
      const w = window.innerWidth;
      const classes: string[] = [];

      // 1. Taille d'écran
      if (w < 768) classes.push('screen-mobile');
      else if (w < 1024) classes.push('screen-tablet');
      else if (w < 1280) classes.push('screen-laptop');
      else classes.push('screen-desktop');

      // 2. Orientation
      if (window.innerHeight > window.innerWidth) {
        classes.push('orientation-portrait');
      } else {
        classes.push('orientation-landscape');
      }

      // 3. Détection navigateur (user agent)
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('edg/') || ua.includes('edge/')) {
        classes.push('browser-edge');
      } else if (ua.includes('chrome') && !ua.includes('edg')) {
        classes.push('browser-chrome');
      } else if (ua.includes('safari') && !ua.includes('chrome')) {
        classes.push('browser-safari');
      } else if (ua.includes('firefox')) {
        classes.push('browser-firefox');
      }

      // 4. Détection OS
      if (/iphone|ipad|ipod/.test(ua)) {
        classes.push('os-ios');
      } else if (ua.includes('android')) {
        classes.push('os-android');
      } else if (ua.includes('mac os')) {
        classes.push('os-macos');
      } else if (ua.includes('windows')) {
        classes.push('os-windows');
      }

      // 5. Touch vs Pointer
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        classes.push('touch-device');
      } else {
        classes.push('pointer-device');
      }

      // 6. High DPI (Retina)
      if (window.devicePixelRatio > 1.5) {
        classes.push('high-dpi');
      }

      // 7. Mode standalone (PWA installée)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        classes.push('standalone');
      }

      // Nettoyer les anciennes classes adaptatives et appliquer les nouvelles
      const oldClasses = Array.from(root.classList).filter(c =>
        c.startsWith('screen-') ||
        c.startsWith('orientation-') ||
        c.startsWith('browser-') ||
        c.startsWith('os-') ||
        c === 'touch-device' || c === 'pointer-device' ||
        c === 'high-dpi' || c === 'standalone'
      );
      oldClasses.forEach(c => root.classList.remove(c));
      classes.forEach(c => root.classList.add(c));

      // Appliquer aussi les dimensions comme CSS custom properties
      root.style.setProperty('--screen-w', `${window.innerWidth}px`);
      root.style.setProperty('--screen-h', `${window.innerHeight}px`);
      root.style.setProperty('--dpr', `${window.devicePixelRatio}`);
    };

    detectAndApply();

    // Écouter les changements
    window.addEventListener('resize', detectAndApply);
    window.addEventListener('orientationchange', detectAndApply);

    // Media queries pour les changements de display-mode
    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    standaloneMq.addEventListener?.('change', detectAndApply);

    return () => {
      window.removeEventListener('resize', detectAndApply);
      window.removeEventListener('orientationchange', detectAndApply);
      standaloneMq.removeEventListener?.('change', detectAndApply);
    };
  }, []);
}
