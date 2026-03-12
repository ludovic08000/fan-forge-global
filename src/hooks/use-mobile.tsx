import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const DESKTOP_BREAKPOINT = 1280;

export type ScreenSize = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Hook de détection automatique de la taille d'écran
 * Retourne le type d'appareil et les dimensions en temps réel
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<ScreenSize>('desktop');
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  React.useEffect(() => {
    const detect = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDimensions({ width: w, height: h });

      if (w < MOBILE_BREAKPOINT) {
        setScreenSize('mobile');
      } else if (w < TABLET_BREAKPOINT) {
        setScreenSize('tablet');
      } else if (w < DESKTOP_BREAKPOINT) {
        setScreenSize('laptop');
      } else {
        setScreenSize('desktop');
      }
    };

    detect();

    // Utiliser ResizeObserver pour une détection plus fiable cross-browser
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => detect());
      ro.observe(document.documentElement);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', detect);
      window.addEventListener('orientationchange', detect);
      return () => {
        window.removeEventListener('resize', detect);
        window.removeEventListener('orientationchange', detect);
      };
    }
  }, []);

  return {
    screenSize,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isLaptop: screenSize === 'laptop',
    isDesktop: screenSize === 'desktop',
    isMobileOrTablet: screenSize === 'mobile' || screenSize === 'tablet',
    isLaptopOrDesktop: screenSize === 'laptop' || screenSize === 'desktop',
    width: dimensions.width,
    height: dimensions.height,
  };
}
