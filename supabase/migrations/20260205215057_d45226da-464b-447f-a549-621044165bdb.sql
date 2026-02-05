-- Mettre à jour la vue public_creator_profiles pour inclure les positions de la couverture
DROP VIEW IF EXISTS public_creator_profiles;

CREATE VIEW public_creator_profiles 
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  username,
  display_name,
  avatar_url,
  cover_url,
  cover_position,
  cover_position_x,
  bio,
  location,
  website,
  is_verified,
  created_at
FROM profiles p
WHERE EXISTS (
  SELECT 1 FROM creators c WHERE c.user_id = p.user_id
);