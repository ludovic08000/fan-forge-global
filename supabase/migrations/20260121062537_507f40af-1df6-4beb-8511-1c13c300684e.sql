-- Permettre aux utilisateurs authentifiés de voir les profils publics des autres utilisateurs
-- Cette policy est nécessaire pour afficher les avatars et noms dans les chats, pages créateurs, etc.
-- Note: Les colonnes sensibles (birthdate, orientation, gender, phone) ne sont pas exposées dans les requêtes client
CREATE POLICY "Authenticated users can view public profile data"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);