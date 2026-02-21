-- Activer les extensions nécessaires pour le cron job
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Planifier le nettoyage automatique des codes promo expirés toutes les 6 heures
SELECT cron.schedule(
  'auto-cleanup-expired-codes',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://usjxcgauyvdocngfkhys.supabase.co/functions/v1/auto-cleanup-expired-codes',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzanhjZ2F1eXZkb2NuZ2ZraHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMjAyMTQsImV4cCI6MjA3Mzc5NjIxNH0.ctjjyUwQ1RE49ij3z1vSL85lJoWopV2L_fGuC2YH6RQ"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);