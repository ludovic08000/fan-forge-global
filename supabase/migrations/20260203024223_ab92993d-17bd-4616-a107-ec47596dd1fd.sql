-- Supprimer les anciennes politiques INSERT si elles existent
DROP POLICY IF EXISTS "Users can create private live requests" ON public.private_live_requests;
DROP POLICY IF EXISTS "Subscribers can request private lives" ON public.private_live_requests;

-- Créer la nouvelle politique INSERT qui vérifie l'abonnement
CREATE POLICY "Subscribers can request private lives"
ON public.private_live_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND public.is_subscribed_to_creator(auth.uid(), creator_id)
);