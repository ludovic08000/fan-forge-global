-- Supprimer et recréer les policies sur subscriptions qui référencent creators
DROP POLICY IF EXISTS "Creators can view their subscriptions" ON public.subscriptions;

-- Recréer avec une sous-requête qui utilise la fonction security definer
CREATE POLICY "Creators can view their subscriptions"
ON public.subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = subscriptions.creator_id
    AND c.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- Également, la policy "Subscribers view premium lives" fait une sous-requête sur subscriptions
-- qui elle-même a une policy qui référence creators. Simplifions cela.
DROP POLICY IF EXISTS "Subscribers view premium lives" ON public.live_streams;

CREATE POLICY "Subscribers view premium lives"
ON public.live_streams
FOR SELECT
USING (
  is_premium = true AND (
    -- Est admin
    is_admin(auth.uid())
    OR
    -- Est le créateur lui-même
    is_creator_owner(creator_id, auth.uid())
    OR
    -- A un abonnement actif (utilise is_subscribed_to_creator qui est security definer)
    is_subscribed_to_creator(auth.uid(), creator_id)
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