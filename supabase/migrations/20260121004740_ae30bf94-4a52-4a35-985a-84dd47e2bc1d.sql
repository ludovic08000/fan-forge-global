-- Ajouter une politique pour permettre la lecture publique des créateurs (non pausés)
CREATE POLICY "Public can view active creators" 
ON public.creators 
FOR SELECT 
USING (is_paused = false OR is_paused IS NULL);

-- Permettre aussi aux utilisateurs authentifiés de lire via la fonction get_public_creator_data
-- Améliorer la vue public_creators_safe pour inclure les données nécessaires
DROP VIEW IF EXISTS public_creators_safe;
CREATE VIEW public_creators_safe AS
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