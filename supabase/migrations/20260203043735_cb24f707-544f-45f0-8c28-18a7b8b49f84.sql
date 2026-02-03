-- Rendre private_live_request_id nullable pour permettre les replays de lives publics
ALTER TABLE private_live_replays 
ALTER COLUMN private_live_request_id DROP NOT NULL;

-- Maintenant migrer les replays existants
INSERT INTO private_live_replays (creator_id, live_stream_id, title, description, file_path, original_price, replay_price, currency, is_available)
SELECT 
  ls.creator_id,
  ls.id as live_stream_id,
  CONCAT('Replay: ', ls.title) as title,
  CONCAT('Replay du live "', ls.title, '"') as description,
  ls.recording_url as file_path,
  COALESCE(NULLIF(ls.price, 0), 5) as original_price,
  COALESCE(NULLIF(ls.price, 0), 5) as replay_price,
  'EUR' as currency,
  true as is_available
FROM live_streams ls
WHERE ls.recording_url IS NOT NULL 
AND ls.status = 'ended'
AND NOT EXISTS (
  SELECT 1 FROM private_live_replays plr WHERE plr.live_stream_id = ls.id
);