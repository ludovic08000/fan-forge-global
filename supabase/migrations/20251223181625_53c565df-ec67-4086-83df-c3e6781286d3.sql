-- Supprimer les anciennes politiques conflictuelles
DROP POLICY IF EXISTS "Abonnés peuvent envoyer des messages privés" ON private_messages;
DROP POLICY IF EXISTS "Abonnés peuvent voir leurs messages privés" ON private_messages;
DROP POLICY IF EXISTS "Créateurs peuvent envoyer des messages privés" ON private_messages;
DROP POLICY IF EXISTS "Créateurs peuvent voir leurs messages privés" ON private_messages;
DROP POLICY IF EXISTS "Only participants can insert messages" ON private_messages;
DROP POLICY IF EXISTS "Only participants can update messages" ON private_messages;
DROP POLICY IF EXISTS "Only participants can view messages" ON private_messages;

-- Créer des politiques simples et claires
CREATE POLICY "Users can view their messages"
ON private_messages FOR SELECT
TO authenticated
USING (
  subscriber_id = auth.uid() 
  OR creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert messages"
ON private_messages FOR INSERT
TO authenticated
WITH CHECK (
  subscriber_id = auth.uid() 
  OR creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their messages"
ON private_messages FOR UPDATE
TO authenticated
USING (
  subscriber_id = auth.uid() 
  OR creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);