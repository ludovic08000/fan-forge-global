-- Schedule private live reminders every 5 minutes
SELECT cron.schedule(
  'send-private-live-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dqplkacbcvyijzaabxsj.supabase.co/functions/v1/send-private-live-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxcGxrYWNiY3Z5aWp6YWFieHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MTc1MjcsImV4cCI6MjA1Nzk5MzUyN30.G7KhZEtVPP9dz_Ne0sYe-BVfxRSiSnmFopP1_pPcSw8"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);