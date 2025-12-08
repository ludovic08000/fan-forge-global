-- Créer une fonction security definer pour vérifier si l'utilisateur possède un créateur
-- Cela évite la récursion en bypassant les RLS de la table creators
CREATE OR REPLACE FUNCTION public.is_creator_owner(_creator_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creators
    WHERE id = _creator_id
      AND user_id = _user_id
  )
$$;

-- Supprimer toutes les policies existantes sur live_streams
DROP POLICY IF EXISTS "Admins full access to live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Creators manage own live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Public view free live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Subscribers view premium lives" ON public.live_streams;

-- Recréer les policies SANS référence directe à la table creators
-- Policy pour les admins (accès complet)
CREATE POLICY "Admins full access to live streams"
ON public.live_streams
FOR ALL
USING (is_admin(auth.uid()));

-- Policy pour les créateurs (gérer leurs propres lives) - utilise la fonction security definer
CREATE POLICY "Creators manage own live streams"
ON public.live_streams
FOR ALL
USING (is_creator_owner(creator_id, auth.uid()));

-- Policy pour voir les lives gratuits (tout le monde)
CREATE POLICY "Public view free live streams"
ON public.live_streams
FOR SELECT
USING (is_premium = false);

-- Policy pour les abonnés voir les lives premium
CREATE POLICY "Subscribers view premium lives"
ON public.live_streams
FOR SELECT
USING (
  is_premium = true AND (
    -- Est admin
    is_admin(auth.uid())
    OR
    -- Est le créateur lui-même (via fonction security definer)
    is_creator_owner(creator_id, auth.uid())
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