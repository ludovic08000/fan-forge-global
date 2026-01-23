-- Mettre à jour la politique SELECT pour permettre aux propriétaires de voir leurs messages même supprimés
DROP POLICY IF EXISTS "Users can view their messages" ON public.private_messages;

CREATE POLICY "Users can view their messages"
ON public.private_messages
FOR SELECT
USING (
  -- Créateur peut toujours voir ses messages
  is_creator_by_user_id(creator_id, auth.uid())
  OR
  -- Abonné peut voir ses messages non supprimés ou payés
  (
    subscriber_id = auth.uid() 
    AND (
      (is_deleted = false OR is_deleted IS NULL)
      AND (price IS NULL OR price = 0 OR is_paid = true)
    )
  )
  OR
  -- Admin peut tout voir
  has_role(auth.uid(), 'admin'::user_role)
);