-- Supprimer les anciennes policies problématiques
DROP POLICY IF EXISTS "Subscribers can view premium live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Public can view free live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Créateurs peuvent gérer leurs lives" ON public.live_streams;

-- Recréer les policies sans récursion
-- Policy pour les admins (accès complet)
CREATE POLICY "Admins can manage all live streams"
ON public.live_streams
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Policy pour les créateurs (gérer leurs propres lives)
CREATE POLICY "Creators can manage own live streams"
ON public.live_streams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM creators c 
    WHERE c.id = live_streams.creator_id 
    AND c.user_id = auth.uid()
  )
);

-- Policy pour voir les lives gratuits (tout le monde)
CREATE POLICY "Anyone can view free live streams"
ON public.live_streams
FOR SELECT
USING (is_premium = false);

-- Policy pour les abonnés voir les lives premium (sans récursion)
CREATE POLICY "Subscribers can view premium lives"
ON public.live_streams
FOR SELECT
USING (
  is_premium = true AND (
    -- Est le créateur lui-même
    EXISTS (
      SELECT 1 FROM creators c 
      WHERE c.id = live_streams.creator_id 
      AND c.user_id = auth.uid()
    )
    OR
    -- A un abonnement actif (requête directe sans fonction)
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.creator_id = live_streams.creator_id
      AND s.subscriber_id = auth.uid()
      AND s.status = 'active'
      AND (s.end_date IS NULL OR s.end_date > NOW())
    )
    OR
    -- A payé pour ce live spécifiquement
    EXISTS (
      SELECT 1 FROM live_stream_payments lsp
      WHERE lsp.live_stream_id = live_streams.id
      AND lsp.subscriber_id = auth.uid()
      AND lsp.status = 'paid'
    )
  )
);