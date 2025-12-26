-- Fonction pour gérer les likes de manière sécurisée
CREATE OR REPLACE FUNCTION public.toggle_content_like(p_content_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_existing_like uuid;
  v_new_count integer;
  v_liked boolean;
BEGIN
  -- Récupérer l'utilisateur authentifié
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Vérifier si le like existe déjà
  SELECT id INTO v_existing_like
  FROM content_likes
  WHERE content_id = p_content_id AND user_id = v_user_id;
  
  IF v_existing_like IS NOT NULL THEN
    -- Supprimer le like
    DELETE FROM content_likes WHERE id = v_existing_like;
    
    -- Décrémenter le compteur
    UPDATE content 
    SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1)
    WHERE id = p_content_id
    RETURNING like_count INTO v_new_count;
    
    v_liked := false;
  ELSE
    -- Ajouter le like
    INSERT INTO content_likes (content_id, user_id)
    VALUES (p_content_id, v_user_id);
    
    -- Incrémenter le compteur
    UPDATE content 
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = p_content_id
    RETURNING like_count INTO v_new_count;
    
    v_liked := true;
  END IF;
  
  RETURN jsonb_build_object(
    'liked', v_liked,
    'like_count', COALESCE(v_new_count, 0)
  );
END;
$$;