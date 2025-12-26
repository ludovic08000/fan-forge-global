-- Créer une fonction pour notifier le créateur lors d'un like
CREATE OR REPLACE FUNCTION notify_creator_on_like()
RETURNS TRIGGER AS $$
DECLARE
  content_creator_id UUID;
  content_title TEXT;
  liker_username TEXT;
BEGIN
  -- Récupérer le creator_id et le titre du contenu
  SELECT creator_id, title INTO content_creator_id, content_title
  FROM content
  WHERE id = NEW.content_id;
  
  -- Récupérer le username de celui qui like
  SELECT COALESCE(username, display_name, 'Un utilisateur') INTO liker_username
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Récupérer le user_id du créateur
  DECLARE
    creator_user_id UUID;
  BEGIN
    SELECT user_id INTO creator_user_id
    FROM creators
    WHERE id = content_creator_id;
    
    -- Ne pas notifier si le créateur like son propre contenu
    IF creator_user_id IS NOT NULL AND creator_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        creator_user_id,
        'content_like',
        'Nouveau like',
        liker_username || ' a aimé votre contenu "' || COALESCE(content_title, 'Sans titre') || '"',
        jsonb_build_object('content_id', NEW.content_id, 'liker_id', NEW.user_id)
      );
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_notify_creator_on_like ON content_likes;

-- Créer le trigger
CREATE TRIGGER trigger_notify_creator_on_like
AFTER INSERT ON content_likes
FOR EACH ROW
EXECUTE FUNCTION notify_creator_on_like();