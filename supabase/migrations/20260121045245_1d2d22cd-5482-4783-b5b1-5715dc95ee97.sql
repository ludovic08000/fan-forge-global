-- Corriger les URLs avec double https://
UPDATE content 
SET file_url = REPLACE(file_url, 'https://https://', 'https://')
WHERE file_url LIKE 'https://https://%';

UPDATE live_streams 
SET recording_url = REPLACE(recording_url, 'https://https://', 'https://')
WHERE recording_url LIKE 'https://https://%';

-- Recréer les replays manquants depuis les live_streams avec recording_url valide
INSERT INTO content (creator_id, title, description, content_type, file_url, is_premium, status, duration, file_size, tags)
SELECT 
  ls.creator_id,
  'Replay: ' || ls.title,
  'Enregistrement du live "' || ls.title || '"',
  'video',
  ls.recording_url,
  true,
  'published',
  NULL,
  NULL,
  ARRAY['replay', 'live']
FROM live_streams ls
WHERE ls.recording_url IS NOT NULL 
  AND ls.recording_error IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM content c WHERE c.file_url = ls.recording_url
  );