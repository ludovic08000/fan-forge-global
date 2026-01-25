-- Ajouter une politique permettant aux utilisateurs authentifiés de voir les créateurs non-pausés
CREATE POLICY "Authenticated users can view active creators"
ON public.creators
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (is_paused IS NULL OR is_paused = false)
);