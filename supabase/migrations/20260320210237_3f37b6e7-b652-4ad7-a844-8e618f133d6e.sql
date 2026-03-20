
-- Fix private_live_replays: hide file_path from anon
REVOKE ALL ON public.private_live_replays FROM anon;
GRANT SELECT (
  id, creator_id, private_live_request_id, live_stream_id, title, description,
  thumbnail_url, duration, original_price, replay_price, currency,
  is_available, view_count, purchase_count, created_at, updated_at
) ON public.private_live_replays TO anon;

CREATE POLICY "Public can view available replay metadata"
  ON public.private_live_replays
  FOR SELECT
  TO anon
  USING (is_available = true);
