-- Supprimer l'ancienne politique qui bloque les créateurs en pause
DROP POLICY IF EXISTS "Authenticated users can view active creators basic info" ON public.creators;

-- Créer une nouvelle politique qui permet aux utilisateurs authentifiés de voir les créateurs actifs
-- ET permet aux propriétaires de toujours voir leur propre profil (même en pause)
CREATE POLICY "Users can view creators"
ON public.creators
FOR SELECT
USING (
  -- Le propriétaire peut toujours voir son propre profil
  auth.uid() = user_id
  OR
  -- Les admins peuvent tout voir
  is_admin(auth.uid())
  OR
  -- Les autres utilisateurs ne voient que les créateurs actifs
  ((is_paused IS NULL OR is_paused = false))
);

-- Supprimer l'ancienne politique redondante
DROP POLICY IF EXISTS "Creators can view own sensitive data" ON public.creators;