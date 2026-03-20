-- Fix private_live_revenue: remplacer jwt() par role()
DROP POLICY IF EXISTS "Service role full access revenue" ON public.private_live_revenue;

CREATE POLICY "Service role full access revenue"
ON public.private_live_revenue
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');