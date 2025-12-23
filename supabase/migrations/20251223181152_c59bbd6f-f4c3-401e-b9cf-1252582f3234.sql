-- Créer une fonction trigger pour notifier les créateurs des nouveaux messages
CREATE OR REPLACE FUNCTION public.notify_creator_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _creator_user_id UUID;
  _subscriber_username TEXT;
  _message_preview TEXT;
BEGIN
  -- Récupérer le user_id du créateur
  SELECT user_id INTO _creator_user_id
  FROM creators
  WHERE id = NEW.creator_id;

  -- Récupérer le username de l'abonné
  SELECT COALESCE(display_name, username, 'Un abonné') INTO _subscriber_username
  FROM profiles
  WHERE user_id = NEW.subscriber_id;

  -- Créer un aperçu du message (max 50 caractères)
  IF NEW.message_type = 'text' THEN
    _message_preview := LEFT(COALESCE(NEW.content, ''), 50);
    IF LENGTH(NEW.content) > 50 THEN
      _message_preview := _message_preview || '...';
    END IF;
  ELSIF NEW.message_type = 'image' THEN
    _message_preview := '📷 Image';
  ELSIF NEW.message_type = 'video' THEN
    _message_preview := '🎥 Vidéo';
  ELSE
    _message_preview := 'Nouveau message';
  END IF;

  -- Créer la notification pour le créateur
  -- On vérifie que ce n'est pas le créateur qui envoie le message
  IF _creator_user_id IS NOT NULL AND _creator_user_id != NEW.subscriber_id THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      _creator_user_id,
      'new_message',
      'Nouveau message de ' || _subscriber_username,
      _message_preview,
      jsonb_build_object(
        'subscriber_id', NEW.subscriber_id,
        'message_id', NEW.id,
        'creator_id', NEW.creator_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table private_messages
DROP TRIGGER IF EXISTS on_new_private_message ON private_messages;
CREATE TRIGGER on_new_private_message
  AFTER INSERT ON private_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_new_message();