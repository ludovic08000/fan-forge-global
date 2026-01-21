-- Mettre à jour les compteurs total_content pour tous les créateurs
UPDATE public.creators 
SET total_content = (
  SELECT COUNT(*) 
  FROM public.content 
  WHERE content.creator_id = creators.id 
  AND content.status = 'published'
);

-- Créer une fonction pour mettre à jour automatiquement total_content
CREATE OR REPLACE FUNCTION public.update_creator_content_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE public.creators SET total_content = total_content + 1 WHERE id = NEW.creator_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'published' THEN
    UPDATE public.creators SET total_content = GREATEST(0, total_content - 1) WHERE id = OLD.creator_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Si le statut change vers published
    IF OLD.status != 'published' AND NEW.status = 'published' THEN
      UPDATE public.creators SET total_content = total_content + 1 WHERE id = NEW.creator_id;
    -- Si le statut change depuis published
    ELSIF OLD.status = 'published' AND NEW.status != 'published' THEN
      UPDATE public.creators SET total_content = GREATEST(0, total_content - 1) WHERE id = NEW.creator_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_update_creator_content_count ON public.content;

-- Créer le trigger
CREATE TRIGGER trigger_update_creator_content_count
  AFTER INSERT OR UPDATE OR DELETE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_content_count();