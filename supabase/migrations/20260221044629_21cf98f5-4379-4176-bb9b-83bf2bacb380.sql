
CREATE OR REPLACE FUNCTION public.notify_creator_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _creator_user_id UUID;
  _subscriber_username TEXT;
  _creator_stage_name TEXT;
  _message_preview TEXT;
  _sender_is_creator BOOLEAN;
BEGIN
  -- Récupérer le user_id du créateur
  SELECT user_id, stage_name INTO _creator_user_id, _creator_stage_name
  FROM creators
  WHERE id = NEW.creator_id;

  -- Déterminer si l'envoyeur est le créateur
  _sender_is_creator := (NEW.sender_id = _creator_user_id);

  -- Créer un aperçu du message (max 50 caractères)
  IF NEW.message_type = 'text' THEN
    _message_preview := LEFT(COALESCE(NEW.content, 'Message'), 50);
    IF LENGTH(COALESCE(NEW.content, '')) > 50 THEN
      _message_preview := _message_preview || '...';
    END IF;
  ELSIF NEW.message_type = 'image' THEN
    _message_preview := '📷 Image';
  ELSIF NEW.message_type = 'video' THEN
    _message_preview := '🎥 Vidéo';
  ELSE
    _message_preview := 'Nouveau message';
  END IF;
  
  IF _message_preview IS NULL OR _message_preview = '' THEN
    _message_preview := 'Nouveau message';
  END IF;

  IF _sender_is_creator THEN
    -- Le créateur envoie un message → notifier l'abonné
    IF _creator_stage_name IS NULL THEN
      _creator_stage_name := 'Un créateur';
    END IF;

    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.subscriber_id,
      'new_message',
      'Nouveau message de ' || _creator_stage_name,
      _message_preview,
      jsonb_build_object(
        'creator_id', NEW.creator_id,
        'message_id', NEW.id,
        'subscriber_id', NEW.subscriber_id
      )
    );
  ELSE
    -- L'abonné envoie un message → notifier le créateur
    SELECT COALESCE(display_name, username, 'Un abonné') INTO _subscriber_username
    FROM profiles
    WHERE user_id = NEW.subscriber_id;
    
    IF _subscriber_username IS NULL THEN
      _subscriber_username := 'Un abonné';
    END IF;

    IF _creator_user_id IS NOT NULL THEN
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
  END IF;

  RETURN NEW;
END;
$function$;
