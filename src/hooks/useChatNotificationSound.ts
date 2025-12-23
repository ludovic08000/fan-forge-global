/**
 * Hook pour jouer un son de notification lors de la réception de messages chat
 */

import { useRef, useCallback } from 'react';

// Son de notification simple en base64 (petit "ding")
const NOTIFICATION_SOUND_BASE64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1+dHFkb3J3fH+Ch4iHhYKAfXt5eHd2dXR0dHR1dnd5e36Ag4WGh4iIiIiHhoWEgoF/fn17enp5eXl5enp7fH1/gIGDhIWGhoaGhoWFhISDgoGAf359fHt7enp6enp7fH1+f4CBgoOEhIWFhYWFhISEg4OCgYB/fn59fHx7e3t7e3x8fX5/f4CBgoKDg4SEhISEhIODgoKBgH9/fn18fHx8fHx8fH19fn5/f4CAgYGCgoKDg4ODg4OCgoKBgYCAf39+fn19fX19fX19fn5+fn9/gICAgYGBgYGBgYGBgYGBgICAf39/fn5+fn5+fn5+fn5+fn9/f3+AgICAgICAgICAgICAgICAf39/f39/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgICAf39/f39/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgICAf39/f39/f39/f39/f39/f39/f4CAgICAgICAgA==';

/**
 * Hook personnalisé pour gérer le son de notification du chat
 */
export const useChatNotificationSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  
  // Initialiser l'audio au premier appel
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_BASE64);
      audioRef.current.volume = 0.5;
    }
    return audioRef.current;
  }, []);

  /**
   * Jouer le son de notification avec rate limiting (max 1 fois par 500ms)
   */
  const playNotificationSound = useCallback(() => {
    const now = Date.now();
    // Limiter à un son toutes les 500ms pour éviter spam
    if (now - lastPlayTimeRef.current < 500) {
      return;
    }
    
    lastPlayTimeRef.current = now;
    
    try {
      const audio = getAudio();
      audio.currentTime = 0;
      audio.play().catch((error) => {
        // Ignorer les erreurs de lecture automatique (navigateur peut bloquer)
        console.log('Cannot play notification sound:', error.message);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [getAudio]);

  return { playNotificationSound };
};
