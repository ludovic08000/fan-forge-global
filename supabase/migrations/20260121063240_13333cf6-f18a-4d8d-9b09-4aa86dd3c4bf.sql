-- Annuler le live "hhihi" qui traîne
UPDATE live_streams 
SET status = 'cancelled', ended_at = NOW() 
WHERE id = '77f51106-32d8-4788-a0f1-7212eb105cd2';

-- Annuler aussi les autres lives scheduled abandonnés sans date programmée
UPDATE live_streams 
SET status = 'cancelled', ended_at = NOW() 
WHERE status = 'scheduled' 
AND scheduled_at IS NULL 
AND created_at < NOW() - INTERVAL '1 hour';