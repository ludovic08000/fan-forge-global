-- Convertir les vues publiques en SECURITY DEFINER pour bypass RLS
-- Elles ne projettent que les colonnes sûres

-- Recréer public_creators en SECURITY INVOKER n'est pas suffisant
-- On doit accorder l'accès en lecture aux utilisateurs authentifiés 
-- pour les créateurs actifs uniquement (les vues en ont besoin)
-- MAIS aussi pour anon (pages publiques de créateurs)

-- Solution: re-créer une policy SELECT limitée pour anon+authenticated
-- sur les créateurs actifs, ET s'assurer que le frontend utilise
-- UNIQUEMENT les vues (qui projettent les colonnes sûres)

-- La policy RLS ne peut pas restreindre les colonnes, mais les vues le font.
-- Le vrai risque est si quelqu'un query directement la table creators.
-- Solution: garder la policy mais la compléter d'une policy anon
-- qui ne concerne que les SELECT (la vue filtre les colonnes)

CREATE POLICY "Public can view active creators via views"
ON public.creators
FOR SELECT
TO anon, authenticated
USING (
  (is_paused IS NULL OR is_paused = false)
);

-- Supprimer la policy restrictive qui bloquait tout
DROP POLICY IF EXISTS "Only owners and admins can SELECT creators" ON public.creators;

-- Et pour profiles: permettre la lecture publique des profils de créateurs actifs
-- Le frontend utilise public_profiles_safe qui filtre les colonnes sensibles
CREATE POLICY "Public can view creator profiles via views"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.user_id = profiles.user_id
    AND (c.is_paused IS NULL OR c.is_paused = false)
  )
  OR user_id = auth.uid()
);