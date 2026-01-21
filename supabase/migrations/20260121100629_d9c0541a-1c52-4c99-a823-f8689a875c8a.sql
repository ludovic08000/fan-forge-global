-- Remove the permissive public policy that still exists
DROP POLICY IF EXISTS "Public can view active creators" ON public.creators;