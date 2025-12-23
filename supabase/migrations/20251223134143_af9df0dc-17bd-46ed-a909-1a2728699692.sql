-- Supprimer l'ancienne politique d'insertion des messages
DROP POLICY IF EXISTS "Users with access can send messages" ON public.live_stream_messages;

-- Recréer la politique avec la bonne logique (is_premium = false OU price = 0)
CREATE POLICY "Users with access can send messages" 
ON public.live_stream_messages 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) 
  AND (
    -- Live gratuit (is_premium false OU prix = 0 OU null)
    EXISTS (
      SELECT 1 FROM live_streams ls
      WHERE ls.id = live_stream_messages.live_stream_id 
      AND (ls.is_premium = false OR ls.price IS NULL OR ls.price = 0)
    )
    -- OU créateur du live
    OR EXISTS (
      SELECT 1 FROM live_streams ls
      JOIN creators c ON ls.creator_id = c.id
      WHERE ls.id = live_stream_messages.live_stream_id 
      AND c.user_id = auth.uid()
    )
    -- OU abonné actif au créateur
    OR EXISTS (
      SELECT 1 FROM live_streams ls
      JOIN subscriptions s ON s.creator_id = ls.creator_id
      WHERE ls.id = live_stream_messages.live_stream_id 
      AND s.subscriber_id = auth.uid() 
      AND s.status = 'active'
    )
    -- OU a payé pour ce live
    OR EXISTS (
      SELECT 1 FROM live_stream_payments
      WHERE live_stream_payments.live_stream_id = live_stream_messages.live_stream_id 
      AND live_stream_payments.subscriber_id = auth.uid() 
      AND live_stream_payments.status = 'paid'
    )
  )
);