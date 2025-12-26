-- Supprimer les anciennes politiques UPDATE qui ne fonctionnent pas correctement
DROP POLICY IF EXISTS "Users can update their messages" ON public.private_messages;
DROP POLICY IF EXISTS "Users can update their own messages for deletion" ON public.private_messages;

-- Créer une nouvelle politique UPDATE qui fonctionne correctement
-- Elle vérifie si l'utilisateur est soit le subscriber, soit le propriétaire du créateur
CREATE POLICY "Users can update their conversation messages"
ON public.private_messages
FOR UPDATE
USING (
  subscriber_id = auth.uid() 
  OR creator_id IN (
    SELECT id FROM creators WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  subscriber_id = auth.uid() 
  OR creator_id IN (
    SELECT id FROM creators WHERE user_id = auth.uid()
  )
);