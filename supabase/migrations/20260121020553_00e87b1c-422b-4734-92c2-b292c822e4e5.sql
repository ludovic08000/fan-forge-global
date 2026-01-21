-- Fix search_path on is_creator_by_user_id function
CREATE OR REPLACE FUNCTION public.is_creator_by_user_id(p_creator_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.creators 
    WHERE id = p_creator_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;