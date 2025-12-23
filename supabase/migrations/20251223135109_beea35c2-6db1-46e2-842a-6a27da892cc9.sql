-- Supprimer la politique existante
DROP POLICY IF EXISTS "Users with access can send messages" ON public.live_stream_messages;

-- Créer une politique SIMPLE: tout utilisateur authentifié peut envoyer un message
-- La vérification d'accès se fait côté frontend
CREATE POLICY "Authenticated users can send messages" 
ON public.live_stream_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);