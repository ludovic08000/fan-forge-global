-- Terminer tous les lives "zombies" (marqués live mais inactifs depuis plus d'1 heure)
UPDATE live_streams 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'live' 
AND (started_at IS NULL OR started_at < NOW() - INTERVAL '2 hours');

-- Créer une fonction pour nettoyer automatiquement les vieux lives
CREATE OR REPLACE FUNCTION public.cleanup_stale_live_streams()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Terminer les lives marqués "live" mais sans activité depuis 2h
  UPDATE live_streams 
  SET status = 'ended', ended_at = NOW() 
  WHERE status = 'live' 
  AND (started_at IS NULL OR started_at < NOW() - INTERVAL '2 hours');
END;
$$;