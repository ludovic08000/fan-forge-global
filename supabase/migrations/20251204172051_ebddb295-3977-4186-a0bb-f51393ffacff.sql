-- Mettre à jour les lives "zombies" qui sont en status "live" mais qui ont démarré il y a plus de 24h
UPDATE live_streams 
SET status = 'ended', 
    ended_at = COALESCE(started_at + INTERVAL '1 hour', NOW())
WHERE status = 'live' 
  AND started_at < NOW() - INTERVAL '24 hours';