-- Le problème vient des policies sur la table creators qui utilisent has_role
-- Mettons à jour les policies de creators pour utiliser is_admin à la place

-- Supprimer les policies existantes sur creators qui causent la récursion
DROP POLICY IF EXISTS "Admins can manage creators" ON public.creators;
DROP POLICY IF EXISTS "Creators can view own sensitive data" ON public.creators;

-- Recréer avec is_admin()
CREATE POLICY "Admins can manage creators"
ON public.creators
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Creators can view own sensitive data"
ON public.creators
FOR SELECT
USING (
  auth.uid() = user_id 
  OR is_admin(auth.uid())
);