-- Créer le cron job pour nettoyer les replays expirés chaque jour à 3h du matin
SELECT cron.schedule(
  'cleanup-old-replays-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://usjxcgauyvdocngfkhys.supabase.co/functions/v1/cleanup-old-replays',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzanhjZ2F1eXZkb2NuZ2ZraHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjAyMTQsImV4cCI6MjA3Mzc5NjIxNH0.ctjjyUwQ1RE49ij3z1vSL85lJoWopV2L_fGuC2YH6RQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);