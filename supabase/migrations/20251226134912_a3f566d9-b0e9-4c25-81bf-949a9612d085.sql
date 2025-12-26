-- Mettre à jour le compteur total_subscribers pour tous les créateurs
UPDATE creators
SET total_subscribers = (
  SELECT COUNT(*) 
  FROM subscriptions 
  WHERE subscriptions.creator_id = creators.id 
  AND subscriptions.status = 'active'
);

-- Créer un trigger pour maintenir le compteur à jour automatiquement
CREATE OR REPLACE FUNCTION update_creator_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Mise à jour pour INSERT ou UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE creators 
    SET total_subscribers = (
      SELECT COUNT(*) FROM subscriptions 
      WHERE subscriptions.creator_id = NEW.creator_id 
      AND subscriptions.status = 'active'
    )
    WHERE id = NEW.creator_id;
  END IF;
  
  -- Mise à jour pour DELETE ou UPDATE (ancien creator_id)
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.creator_id != NEW.creator_id) THEN
    UPDATE creators 
    SET total_subscribers = (
      SELECT COUNT(*) FROM subscriptions 
      WHERE subscriptions.creator_id = OLD.creator_id 
      AND subscriptions.status = 'active'
    )
    WHERE id = OLD.creator_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_subscriber_count ON subscriptions;

-- Créer le trigger
CREATE TRIGGER trigger_update_subscriber_count
AFTER INSERT OR UPDATE OR DELETE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_creator_subscriber_count();