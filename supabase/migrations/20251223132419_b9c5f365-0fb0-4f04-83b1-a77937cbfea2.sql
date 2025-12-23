-- Corriger le live actuel : prix à 0 = live gratuit, donc is_premium doit être false
UPDATE live_streams 
SET is_premium = false 
WHERE id = 'e4eb3ade-e414-4311-aec8-e55f72de3fad';

-- Mettre à jour la fonction has_live_access pour considérer is_premium = false OU price = 0 comme gratuit
CREATE OR REPLACE FUNCTION has_live_access(_subscriber_id uuid, _live_stream_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    -- Le live est gratuit (is_premium = false OU prix = 0)
    SELECT 1 FROM live_streams 
    WHERE id = _live_stream_id 
    AND (is_premium = false OR price IS NULL OR price = 0)
  ) OR EXISTS (
    -- L'utilisateur est le créateur du live
    SELECT 1 FROM live_streams ls
    JOIN creators c ON ls.creator_id = c.id
    WHERE ls.id = _live_stream_id
    AND c.user_id = _subscriber_id
  ) OR EXISTS (
    -- L'utilisateur a un abonnement actif au créateur
    SELECT 1 FROM live_streams ls
    JOIN creators c ON ls.creator_id = c.id
    WHERE ls.id = _live_stream_id
    AND is_subscribed_to_creator(_subscriber_id, c.id)
  ) OR EXISTS (
    -- L'utilisateur a payé pour ce live spécifiquement
    SELECT 1 FROM live_stream_payments
    WHERE live_stream_id = _live_stream_id
    AND subscriber_id = _subscriber_id
    AND status = 'paid'
  );
END;
$$;