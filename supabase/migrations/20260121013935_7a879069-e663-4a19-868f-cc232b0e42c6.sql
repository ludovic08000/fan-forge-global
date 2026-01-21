-- Corriger la fonction toggle_content_like pour NE PAS modifier like_count
-- Le trigger update_content_like_count s'en charge déjà

CREATE OR REPLACE FUNCTION public.toggle_content_like(p_content_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Supprimer le like (le trigger mettra à jour like_count)
    DELETE FROM content_likes WHERE id = v_existing_like;
    v_liked := false;
  ELSE
    -- Ajouter le like (le trigger mettra à jour like_count)
    INSERT INTO content_likes (content_id, user_id)
    VALUES (p_content_id, v_user_id);
    v_liked := true;
  END IF;
  
  -- Récupérer le nouveau compteur après le trigger
  SELECT like_count INTO v_new_count
  FROM content
  WHERE id = p_content_id;
  
  RETURN jsonb_build_object(
    'liked', v_liked,
    'like_count', COALESCE(v_new_count, 0)
  );
END;
$function$;

-- Synchroniser les compteurs actuels avec les vraies valeurs
UPDATE content c
SET like_count = (
  SELECT COUNT(*) FROM content_likes cl WHERE cl.content_id = c.id
);