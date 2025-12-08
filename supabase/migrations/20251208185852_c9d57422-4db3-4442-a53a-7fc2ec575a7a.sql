-- Créer une fonction security definer pour vérifier si l'utilisateur est admin
-- Cette fonction évite la récursion en utilisant SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Supprimer toutes les policies existantes sur live_streams
DROP POLICY IF EXISTS "Admins can manage all live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Creators can manage own live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Anyone can view free live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Subscribers can view premium lives" ON public.live_streams;

-- Recréer les policies avec is_admin() au lieu de has_role()
-- Policy pour les admins (accès complet) - DOIT être la première évaluée
CREATE POLICY "Admins full access to live streams"
ON public.live_streams
FOR ALL
USING (is_admin(auth.uid()));

-- Policy pour les créateurs (gérer leurs propres lives)
CREATE POLICY "Creators manage own live streams"
ON public.live_streams
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM creators c 
    WHERE c.id = live_streams.creator_id 
    AND c.user_id = auth.uid()
  )
);

-- Policy pour voir les lives gratuits (tout le monde)
CREATE POLICY "Public view free live streams"
ON public.live_streams
FOR SELECT
USING (is_premium = false);

-- Policy pour les abonnés voir les lives premium (sans fonction récursive)
CREATE POLICY "Subscribers view premium lives"
ON public.live_streams
FOR SELECT
USING (
  is_premium = true AND (
    -- Est admin
    is_admin(auth.uid())
    OR
    -- Est le créateur lui-même
    EXISTS (
      SELECT 1 FROM creators c 
      WHERE c.id = live_streams.creator_id 
      AND c.user_id = auth.uid()
    )
    OR
    -- A un abonnement actif
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.creator_id = live_streams.creator_id
      AND s.subscriber_id = auth.uid()
      AND s.status = 'active'
      AND (s.end_date IS NULL OR s.end_date > NOW())
    )
    OR
    -- A payé pour ce live spécifiquement
    EXISTS (
      SELECT 1 FROM live_stream_payments lsp
      WHERE lsp.live_stream_id = live_streams.id
      AND lsp.subscriber_id = auth.uid()
      AND lsp.status = 'paid'
    )
  )
);