-- Fix update_creator_subscriber_count function with secure search_path
CREATE OR REPLACE FUNCTION public.update_creator_subscriber_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update for INSERT or UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE creators 
    SET total_subscribers = (
      SELECT COUNT(*) FROM subscriptions 
      WHERE subscriptions.creator_id = NEW.creator_id 
      AND subscriptions.status = 'active'
    )
    WHERE id = NEW.creator_id;
  END IF;
  
  -- Update for DELETE or UPDATE (old creator_id)
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
$$;