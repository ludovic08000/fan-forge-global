/**
 * Hook de collecte des Web Vitals côté client
 * Envoie les métriques au serveur pour analyse IA
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebVitals {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
}

// Generate a stable session ID
const getSessionId = (): string => {
  let id = sessionStorage.getItem('perf_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('perf_session_id', id);
  }
  return id;
};

const getDeviceType = (): string => {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
};

/**
 * Collect Web Vitals using PerformanceObserver API
 */
const collectWebVitals = (): Promise<WebVitals> => {
  return new Promise((resolve) => {
    const vitals: WebVitals = {};
    const observers: PerformanceObserver[] = [];
    let resolved = false;

    const tryResolve = () => {
      if (!resolved && (vitals.lcp !== undefined || vitals.fcp !== undefined)) {
        resolved = true;
        observers.forEach(o => { try { o.disconnect(); } catch {} });
        resolve(vitals);
      }
    };

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as any;
        if (last) vitals.lcp = Math.round(last.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);
    } catch {}

    // FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0] as any;
        if (entry) vitals.fid = Math.round(entry.processingStart - entry.startTime);
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      observers.push(fidObserver);
    } catch {}

    // CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        vitals.cls = Math.round(clsValue * 1000) / 1000;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);
    } catch {}

    // FCP
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries().find(e => e.name === 'first-contentful-paint');
        if (entry) vitals.fcp = Math.round(entry.startTime);
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
      observers.push(fcpObserver);
    } catch {}

    // TTFB from navigation timing
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (nav) vitals.ttfb = Math.round(nav.responseStart - nav.requestStart);
    } catch {}

    // INP
    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          const duration = entry.duration;
          if (!vitals.inp || duration > vitals.inp) vitals.inp = Math.round(duration);
        }
      });
      inpObserver.observe({ type: 'event', buffered: true });
      observers.push(inpObserver);
    } catch {}

    // Resolve after 5s max
    setTimeout(() => {
      resolved = true;
      observers.forEach(o => { try { o.disconnect(); } catch {} });
      resolve(vitals);
    }, 5000);

    // Try to resolve earlier
    setTimeout(tryResolve, 3000);
  });
};

/**
 * Hook principal - collecte et envoie les métriques
 * S'exécute une seule fois par session, après le chargement complet
 */
export const useWebVitalsCollector = () => {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;

    // Wait for page to be fully loaded + idle
    const timer = setTimeout(async () => {
      if (sent.current) return;
      sent.current = true;

      try {
        const vitals = await collectWebVitals();

        // Additional metrics
        const domNodes = document.querySelectorAll('*').length;
        const resources = performance.getEntriesByType('resource');
        const totalTransfer = resources.reduce((sum, r: any) => sum + (r.transferSize || 0), 0);
        const jsHeap = (performance as any).memory?.usedJSHeapSize || null;

        // Send to edge function for AI analysis
        const payload = {
          session_id: getSessionId(),
          page_url: window.location.pathname,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          ...vitals,
          dom_nodes: domNodes,
          js_heap_size: jsHeap ? Math.round(jsHeap / 1048576) : null,
          resource_count: resources.length,
          total_transfer_size: Math.round(totalTransfer / 1024),
        };

        // Fire-and-forget: don't block UI
        supabase.functions.invoke('analyze-performance', {
          body: payload,
        }).catch(() => {/* silent fail - perf monitoring should never impact UX */});

      } catch {
        // Never let monitoring break the app
      }
    }, 8000); // Wait 8s after mount for stable metrics

    return () => clearTimeout(timer);
  }, []);
};

export default useWebVitalsCollector;
