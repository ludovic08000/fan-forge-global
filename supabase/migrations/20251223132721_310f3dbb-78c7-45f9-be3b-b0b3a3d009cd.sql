-- Corriger la politique INSERT pour les messages live
-- Permettre aux utilisateurs authentifiés d'envoyer des messages s'ils ont accès au live
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent envoyer des messages" ON live_stream_messages;

CREATE POLICY "Users with access can send messages" 
ON live_stream_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Lives gratuits accessibles à tous les utilisateurs connectés
    EXISTS (
      SELECT 1 FROM live_streams ls 
      WHERE ls.id = live_stream_id 
      AND (ls.is_premium = false OR ls.price IS NULL OR ls.price = 0)
    )
    OR 
    -- Créateur du live
    EXISTS (
      SELECT 1 FROM live_streams ls
      JOIN creators c ON ls.creator_id = c.id
      WHERE ls.id = live_stream_id AND c.user_id = auth.uid()
    )
    OR
    -- Abonné au créateur
    EXISTS (
      SELECT 1 FROM live_streams ls
      JOIN subscriptions s ON s.creator_id = ls.creator_id
      WHERE ls.id = live_stream_id 
      AND s.subscriber_id = auth.uid() 
      AND s.status = 'active'
    )
    OR
    -- Paiement pour le live
    EXISTS (
      SELECT 1 FROM live_stream_payments 
      WHERE live_stream_id = live_stream_messages.live_stream_id 
      AND subscriber_id = auth.uid() 
      AND status = 'paid'
    )
  )
);