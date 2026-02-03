-- Ajouter le suivi des no-shows et pénalités créateur
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS noshow_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS noshow_penalty_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lives_blocked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS visibility_reduced BOOLEAN DEFAULT false;

-- Commentaires
COMMENT ON COLUMN creators.noshow_count IS 'Nombre total de no-shows du créateur';
COMMENT ON COLUMN creators.noshow_penalty_level IS '0=normal, 1=visibilité réduite, 2=lives bloqués';
COMMENT ON COLUMN creators.lives_blocked_until IS 'Date jusqu à laquelle les lives privés sont bloqués';
COMMENT ON COLUMN creators.visibility_reduced IS 'Si true, créateur moins visible dans les recherches';

-- Fonction pour incrémenter le compteur no-show
CREATE OR REPLACE FUNCTION increment_creator_noshow(p_creator_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Incrémenter le compteur
  UPDATE creators 
  SET noshow_count = COALESCE(noshow_count, 0) + 1,
      updated_at = now()
  WHERE id = p_creator_id
  RETURNING noshow_count INTO v_count;
  
  -- Appliquer pénalités automatiques selon le nombre
  IF v_count >= 5 THEN
    -- 5+ no-shows: bloquer les lives pour 30 jours
    UPDATE creators 
    SET noshow_penalty_level = 2,
        lives_blocked_until = now() + interval '30 days',
        visibility_reduced = true
    WHERE id = p_creator_id;
  ELSIF v_count >= 3 THEN
    -- 3-4 no-shows: réduire la visibilité
    UPDATE creators 
    SET noshow_penalty_level = 1,
        visibility_reduced = true
    WHERE id = p_creator_id;
  END IF;
END;
$$;