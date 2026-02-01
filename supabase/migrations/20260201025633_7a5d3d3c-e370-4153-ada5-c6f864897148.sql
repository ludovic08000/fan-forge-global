-- Mettre à jour la policy SELECT pour permettre au subscriber de voir ses propres demandes de média
-- même quand un prix a été fixé et qu'il n'a pas encore payé

DROP POLICY IF EXISTS "Users can view their messages" ON public.private_messages;

CREATE POLICY "Users can view their messages" 
ON public.private_messages 
FOR SELECT 
USING (
  -- Le créateur peut tout voir
  is_creator_by_user_id(creator_id, auth.uid())
  OR 
  -- L'admin peut tout voir
  has_role(auth.uid(), 'admin'::user_role)
  OR 
  -- Le subscriber peut voir ses messages:
  (
    subscriber_id = auth.uid() 
    AND (is_deleted = false OR is_deleted IS NULL)
    AND (
      -- Messages gratuits ou payés
      price IS NULL OR price = 0 OR is_paid = true
      -- OU messages de type request (sa propre demande)
      OR message_type IN ('image_request', 'video_request')
    )
  )
);