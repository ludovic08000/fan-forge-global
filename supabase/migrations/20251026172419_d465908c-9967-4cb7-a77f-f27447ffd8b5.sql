-- Ajouter une politique pour permettre aux utilisateurs de créer leur propre rôle lors de l'inscription
CREATE POLICY "Users can create their own role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);