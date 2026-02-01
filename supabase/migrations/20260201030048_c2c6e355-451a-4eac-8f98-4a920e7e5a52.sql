-- Mettre à jour la policy SELECT pour permettre au subscriber de voir TOUS les messages:
-- 1. Ses demandes de média (image_request, video_request)
-- 2. Les contenus payants envoyés par le créateur (image, video) même s'ils ne sont pas encore payés

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
      -- Messages gratuits ou déjà payés
      price IS NULL OR price = 0 OR is_paid = true
      -- OU messages de type request (sa propre demande)
      OR message_type IN ('image_request', 'video_request')
      -- OU contenus payants envoyés par le créateur (pour qu'il puisse voir et payer)
      OR message_type IN ('image', 'video')
    )
  )
);