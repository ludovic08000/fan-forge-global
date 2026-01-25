-- Recréer la fonction avec une protection contre les creators orphelins
CREATE OR REPLACE FUNCTION public.update_creator_subscriber_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update for INSERT or UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Vérifier que le creator existe et a un user valide
    IF EXISTS (SELECT 1 FROM creators c JOIN auth.users u ON c.user_id = u.id WHERE c.id = NEW.creator_id) THEN
      UPDATE creators 
      SET total_subscribers = (
        SELECT COUNT(*) FROM subscriptions 
        WHERE subscriptions.creator_id = NEW.creator_id 
        AND subscriptions.status = 'active'
      )
      WHERE id = NEW.creator_id;
    END IF;
  END IF;
  
  -- Update for DELETE or UPDATE (old creator_id)
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.creator_id != NEW.creator_id) THEN
    -- Vérifier que le creator existe et a un user valide
    IF EXISTS (SELECT 1 FROM creators c JOIN auth.users u ON c.user_id = u.id WHERE c.id = OLD.creator_id) THEN
      UPDATE creators 
      SET total_subscribers = (
        SELECT COUNT(*) FROM subscriptions 
        WHERE subscriptions.creator_id = OLD.creator_id 
        AND subscriptions.status = 'active'
      )
      WHERE id = OLD.creator_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS update_creator_subscriber_count_trigger ON public.subscriptions;
CREATE TRIGGER update_creator_subscriber_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_creator_subscriber_count();