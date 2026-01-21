import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook pour la protection anti-capture du contenu
 * 
 * ⚠️ TEMPORAIREMENT DÉSACTIVÉ POUR DÉBOGAGE ⚠️
 * TODO: Réactiver après résolution des bugs
 */
export const useContentProtection = (enabled: boolean = true) => {
  // DÉSACTIVÉ TEMPORAIREMENT - Toujours retourner false pour éviter les interférences
  const [isBlurred] = useState(false);

  // Protection désactivée - ne rien faire
  useEffect(() => {
    if (!enabled) return;
    
    // ⚠️ PROTECTIONS DÉSACTIVÉES TEMPORAIREMENT
    // Réactiver après résolution des bugs du bouton subscribe
    console.log('[DEBUG] Content protection is temporarily DISABLED');
    
  }, [enabled]);

  return { isBlurred };
};