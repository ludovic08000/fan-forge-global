-- Corriger la vue pour éviter SECURITY DEFINER
DROP VIEW IF EXISTS public_creators_safe;
CREATE VIEW public_creators_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  stage_name,
  category,
  subscription_price,
  currency,
  is_featured,
  featured_until,
  total_subscribers,
  total_content,
  is_accepting_tips,
  gender,
  orientation,
  content_type,
  is_paused,
  created_at
FROM creators
WHERE is_paused = false OR is_paused IS NULL;