-- Fonction pour créer une notification lors d'un nouvel abonnement
CREATE OR REPLACE FUNCTION public.notify_creator_new_subscription()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  subscriber_name TEXT;
BEGIN
  -- Récupérer le user_id du créateur
  SELECT user_id INTO creator_user_id FROM creators WHERE id = NEW.creator_id;
  
  -- Récupérer le nom de l'abonné
  SELECT COALESCE(display_name, username, 'Un abonné') INTO subscriber_name 
  FROM profiles WHERE user_id = NEW.subscriber_id;
  
  -- Créer la notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    creator_user_id,
    'new_subscriber',
    'Nouvel abonnement ! 🎉',
    subscriber_name || ' s''est abonné à votre profil',
    jsonb_build_object(
      'subscriber_id', NEW.subscriber_id,
      'amount', NEW.price,
      'currency', COALESCE(NEW.currency, 'EUR')
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour les nouveaux abonnements
DROP TRIGGER IF EXISTS on_new_subscription_notify ON subscriptions;
CREATE TRIGGER on_new_subscription_notify
  AFTER INSERT ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_new_subscription();

-- Fonction pour créer une notification lors d'un tip
CREATE OR REPLACE FUNCTION public.notify_creator_new_tip()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  sender_name TEXT;
BEGIN
  -- Récupérer le user_id du créateur
  SELECT user_id INTO creator_user_id FROM creators WHERE id = NEW.creator_id;
  
  -- Récupérer le nom de l'expéditeur
  SELECT COALESCE(display_name, username, 'Un fan') INTO sender_name 
  FROM profiles WHERE user_id = NEW.sender_id;
  
  -- Créer la notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    creator_user_id,
    'tip_received',
    'Tip reçu ! 💝',
    sender_name || ' vous a envoyé ' || NEW.amount || '€',
    jsonb_build_object(
      'sender_id', NEW.sender_id,
      'amount', NEW.amount,
      'currency', COALESCE(NEW.currency, 'EUR'),
      'message', NEW.message
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour les tips
DROP TRIGGER IF EXISTS on_new_tip_notify ON tips;
CREATE TRIGGER on_new_tip_notify
  AFTER INSERT ON tips
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_new_tip();

-- Fonction pour notifier les paiements de contenu privé
CREATE OR REPLACE FUNCTION public.notify_creator_private_content_payment()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  subscriber_name TEXT;
  msg_creator_id UUID;
BEGIN
  -- Récupérer le creator_id du message
  SELECT creator_id INTO msg_creator_id FROM private_messages WHERE id = NEW.message_id;
  
  -- Récupérer le user_id du créateur
  SELECT user_id INTO creator_user_id FROM creators WHERE id = msg_creator_id;
  
  -- Récupérer le nom de l'abonné
  SELECT COALESCE(display_name, username, 'Un abonné') INTO subscriber_name 
  FROM profiles WHERE user_id = NEW.subscriber_id;
  
  -- Créer la notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    creator_user_id,
    'sale',
    'Contenu débloqué ! 💰',
    subscriber_name || ' a acheté votre contenu pour ' || NEW.amount || '€',
    jsonb_build_object(
      'subscriber_id', NEW.subscriber_id,
      'amount', NEW.amount,
      'message_id', NEW.message_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour les paiements de contenu privé
DROP TRIGGER IF EXISTS on_private_content_payment_notify ON private_content_payments;
CREATE TRIGGER on_private_content_payment_notify
  AFTER INSERT ON private_content_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION notify_creator_private_content_payment();

-- Fonction pour notifier les paiements de live
CREATE OR REPLACE FUNCTION public.notify_creator_live_payment()
RETURNS TRIGGER AS $$
DECLARE
  creator_user_id UUID;
  subscriber_name TEXT;
  live_creator_id UUID;
  live_title TEXT;
BEGIN
  -- Récupérer le creator_id et titre du live
  SELECT creator_id, title INTO live_creator_id, live_title FROM live_streams WHERE id = NEW.live_stream_id;
  
  -- Récupérer le user_id du créateur
  SELECT user_id INTO creator_user_id FROM creators WHERE id = live_creator_id;
  
  -- Récupérer le nom du spectateur
  SELECT COALESCE(display_name, username, 'Un spectateur') INTO subscriber_name 
  FROM profiles WHERE user_id = NEW.subscriber_id;
  
  -- Créer la notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    creator_user_id,
    'payment_success',
    'Accès live vendu ! 🎬',
    subscriber_name || ' a payé ' || NEW.amount || '€ pour "' || COALESCE(live_title, 'Live') || '"',
    jsonb_build_object(
      'subscriber_id', NEW.subscriber_id,
      'amount', NEW.amount,
      'live_stream_id', NEW.live_stream_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour les paiements de live
DROP TRIGGER IF EXISTS on_live_payment_notify ON live_stream_payments;
CREATE TRIGGER on_live_payment_notify
  AFTER INSERT ON live_stream_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION notify_creator_live_payment();