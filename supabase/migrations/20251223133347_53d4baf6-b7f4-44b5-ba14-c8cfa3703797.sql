-- Terminer automatiquement les lives zombies (heartbeat > 5 minutes)
UPDATE live_streams 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'live' 
AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - INTERVAL '5 minutes');

-- Créer une fonction pour nettoyer automatiquement les lives inactifs
CREATE OR REPLACE FUNCTION public.auto_cleanup_stale_lives()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE live_streams 
  SET status = 'ended', ended_at = NOW() 
  WHERE status = 'live' 
  AND (last_heartbeat IS NULL OR last_heartbeat < NOW() - INTERVAL '5 minutes');
END;
$$;