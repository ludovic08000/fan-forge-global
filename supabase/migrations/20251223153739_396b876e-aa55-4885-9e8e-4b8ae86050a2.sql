-- Nettoyer les lives fantômes: marquer comme "ended" tous les lives 
-- avec status 'live' mais heartbeat > 5 minutes
UPDATE live_streams 
SET status = 'ended', ended_at = now()
WHERE status = 'live' 
AND (last_heartbeat IS NULL OR last_heartbeat < now() - interval '5 minutes');

-- Créer un job automatique pour nettoyer les lives fantômes
CREATE OR REPLACE FUNCTION auto_cleanup_stale_lives()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marquer les lives comme terminés si pas de heartbeat depuis 5 minutes
  UPDATE live_streams 
  SET status = 'ended', ended_at = now()
  WHERE status = 'live' 
  AND (last_heartbeat IS NULL OR last_heartbeat < now() - interval '5 minutes');
  
  -- Logger le cleanup
  RAISE NOTICE 'Cleaned up stale live streams';
END;
$$;