-- Terminer TOUS les lives marqués comme "live" car ce sont des zombies
UPDATE live_streams 
SET status = 'ended', ended_at = NOW() 
WHERE status = 'live';