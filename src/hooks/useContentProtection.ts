/**
 * Hook pour la protection anti-capture du contenu
 * 
 * ⚠️ TEMPORAIREMENT DÉSACTIVÉ POUR DÉBOGAGE ⚠️
 * TODO: Réactiver après résolution des bugs
 */
export const useContentProtection = (_enabled: boolean = true) => {
  // Protection désactivée temporairement - retourne toujours false
  return { isBlurred: false };
};