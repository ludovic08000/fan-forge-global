-- Créer une fonction pour appeler le ping sitemap via pg_net
CREATE OR REPLACE FUNCTION public.ping_sitemap_on_new_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Appeler l'edge function ping-sitemap de manière asynchrone via pg_net
  -- Note: pg_net n'est pas disponible, on log juste l'événement pour l'instant
  -- Le ping peut être fait manuellement ou via un cron job
  RAISE NOTICE 'New creator registered, sitemap should be pinged: %', NEW.id;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table creators
DROP TRIGGER IF EXISTS trigger_ping_sitemap_on_new_creator ON public.creators;
CREATE TRIGGER trigger_ping_sitemap_on_new_creator
  AFTER INSERT ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.ping_sitemap_on_new_creator();

-- Ajouter un commentaire pour documentation
COMMENT ON FUNCTION public.ping_sitemap_on_new_creator() IS 'Triggered when a new creator registers to notify that the sitemap should be updated';