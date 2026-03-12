/**
 * Hook pour jouer un son de notification cross-browser (Safari, Chrome, Edge, Firefox)
 * Utilise Web Audio API comme fallback pour Safari qui bloque souvent HTMLAudioElement
 */

import { useRef, useCallback, useEffect } from 'react';

// Générer un son de notification via Web Audio API (compatible tous navigateurs)
const createNotificationBeep = (audioContext: AudioContext) => {
  const duration = 0.15;
  const now = audioContext.currentTime;

  // Oscillateur principal (ding aigu)
  const osc1 = audioContext.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
  osc1.frequency.exponentialRampToValueAtTime(880, now + duration);

  // Gain avec envelope
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc1.connect(gainNode);
  gainNode.connect(audioContext.destination);

  osc1.start(now);
  osc1.stop(now + duration);

  // Deuxième ding (harmonique)
  const osc2 = audioContext.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1760, now);
  osc2.frequency.exponentialRampToValueAtTime(1320, now + duration);

  const gain2 = audioContext.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.2, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + duration);

  osc2.connect(gain2);
  gain2.connect(audioContext.destination);

  osc2.start(now + 0.02);
  osc2.stop(now + duration + 0.05);
};

/**
 * Hook personnalisé pour gérer le son de notification du chat
 * Compatible Safari, Chrome, Edge, Firefox
 */
export const useChatNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const isUnlockedRef = useRef(false);

  // Créer ou récupérer l'AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      // Utiliser webkitAudioContext pour les anciens Safari
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    return audioContextRef.current;
  }, []);

  // Débloquer l'audio au premier geste utilisateur (requis par Safari/Chrome)
  useEffect(() => {
    const unlockAudio = () => {
      if (isUnlockedRef.current) return;

      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isUnlockedRef.current = true;
        }).catch(() => {
          // Silently fail
        });
      } else if (ctx) {
        isUnlockedRef.current = true;
      }
    };

    // Écouter les gestes utilisateur pour débloquer l'audio
    const events = ['click', 'touchstart', 'keydown', 'pointerdown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: false, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, [getAudioContext]);

  // Cleanup à la destruction
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  /**
   * Jouer le son de notification avec rate limiting (max 1 fois par 500ms)
   */
  const playNotificationSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayTimeRef.current < 500) return;
    lastPlayTimeRef.current = now;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      // Résumer si suspendu (Safari)
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          createNotificationBeep(ctx);
        }).catch(() => {});
      } else {
        createNotificationBeep(ctx);
      }
    } catch (error) {
      console.warn('Cannot play notification sound:', error);
    }
  }, [getAudioContext]);

  return { playNotificationSound };
};
