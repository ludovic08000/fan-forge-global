-- Synchroniser les compteurs de vues depuis content_views
UPDATE content
SET view_count = (
  SELECT COUNT(*) 
  FROM content_views 
  WHERE content_views.content_id = content.id
);

-- Synchroniser les compteurs de likes depuis content_likes
UPDATE content
SET like_count = (
  SELECT COUNT(*) 
  FROM content_likes 
  WHERE content_likes.content_id = content.id
);

-- Créer un trigger pour mettre à jour view_count automatiquement
CREATE OR REPLACE FUNCTION update_content_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE content 
  SET view_count = (
    SELECT COUNT(*) FROM content_views 
    WHERE content_views.content_id = NEW.content_id
  )
  WHERE id = NEW.content_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer un trigger pour mettre à jour like_count automatiquement
CREATE OR REPLACE FUNCTION update_content_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE content 
    SET like_count = (
      SELECT COUNT(*) FROM content_likes 
      WHERE content_likes.content_id = NEW.content_id
    )
    WHERE id = NEW.content_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE content 
    SET like_count = (
      SELECT COUNT(*) FROM content_likes 
      WHERE content_likes.content_id = OLD.content_id
    )
    WHERE id = OLD.content_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_update_view_count ON content_views;
DROP TRIGGER IF EXISTS trigger_update_like_count ON content_likes;

-- Créer les nouveaux triggers
CREATE TRIGGER trigger_update_view_count
AFTER INSERT ON content_views
FOR EACH ROW
EXECUTE FUNCTION update_content_view_count();

CREATE TRIGGER trigger_update_like_count
AFTER INSERT OR DELETE ON content_likes
FOR EACH ROW
EXECUTE FUNCTION update_content_like_count();