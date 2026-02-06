-- Permettre aux utilisateurs authentifiés de voir les profils des créateurs (données publiques uniquement via la vue)
-- Cette politique permet l'accès SELECT aux profils qui sont des créateurs

CREATE POLICY "Authenticated users can view creator profiles for public display"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- L'utilisateur peut voir son propre profil OU les profils de créateurs
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM creators c 
    WHERE c.user_id = profiles.user_id 
    AND c.is_paused = false
  )
);