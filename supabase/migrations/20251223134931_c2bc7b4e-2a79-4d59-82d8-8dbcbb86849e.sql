-- Supprimer et recréer la politique avec une logique plus simple
DROP POLICY IF EXISTS "Users with access can send messages" ON public.live_stream_messages;

-- Recréer avec condition simplifiée: tout utilisateur authentifié peut envoyer si le live est gratuit (price <= 0 ou price IS NULL) OU il a accès
CREATE POLICY "Users with access can send messages" 
ON public.live_stream_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Live gratuit: is_premium false OU price <= 0 OU price null
    EXISTS (
      SELECT 1 FROM live_streams ls
      WHERE ls.id = live_stream_messages.live_stream_id 
      AND (
        ls.is_premium = false 
        OR ls.price IS NULL 
        OR ls.price <= 0
      )
    )
    -- OU créateur du live
    OR EXISTS (
      SELECT 1 FROM live_streams ls
      JOIN creators c ON ls.creator_id = c.id
      WHERE ls.id = live_stream_messages.live_stream_id 
      AND c.user_id = auth.uid()
    )
    -- OU abonné actif
    OR EXISTS (
      SELECT 1 FROM live_streams ls
      JOIN subscriptions s ON s.creator_id = ls.creator_id
      WHERE ls.id = live_stream_messages.live_stream_id 
      AND s.subscriber_id = auth.uid() 
      AND s.status = 'active'
    )
    -- OU a payé pour ce live
    OR EXISTS (
      SELECT 1 FROM live_stream_payments lsp
      WHERE lsp.live_stream_id = live_stream_messages.live_stream_id 
      AND lsp.subscriber_id = auth.uid() 
      AND lsp.status = 'paid'
    )
  )
);