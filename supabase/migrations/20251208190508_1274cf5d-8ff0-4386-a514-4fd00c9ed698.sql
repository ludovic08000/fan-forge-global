-- Créer une fonction security definer pour vérifier si un live appartient à un créateur
CREATE OR REPLACE FUNCTION public.is_live_stream_creator(_live_stream_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.live_streams ls
    JOIN public.creators c ON c.id = ls.creator_id
    WHERE ls.id = _live_stream_id
      AND c.user_id = _user_id
  )
$$;

-- Supprimer et recréer les policies sur live_stream_payments
DROP POLICY IF EXISTS "Créateurs peuvent voir les paiements de leurs lives" ON public.live_stream_payments;

CREATE POLICY "Créateurs peuvent voir les paiements de leurs lives"
ON public.live_stream_payments
FOR SELECT
USING (is_live_stream_creator(live_stream_id, auth.uid()));

-- Faire pareil pour live_stream_messages qui a probablement le même problème
DROP POLICY IF EXISTS "Users with live access can view messages" ON public.live_stream_messages;

CREATE POLICY "Users with live access can view messages"
ON public.live_stream_messages
FOR SELECT
USING (has_live_access(auth.uid(), live_stream_id));

-- Et pour live_stream_viewers, live_stream_bans, live_stream_settings
DROP POLICY IF EXISTS "Créateurs peuvent voir leurs spectateurs" ON public.live_stream_viewers;

CREATE POLICY "Créateurs peuvent voir leurs spectateurs"
ON public.live_stream_viewers
FOR SELECT
USING (is_live_stream_creator(live_stream_id, auth.uid()));

DROP POLICY IF EXISTS "Créateurs peuvent voir et gérer les bans de leurs lives" ON public.live_stream_bans;

CREATE POLICY "Créateurs peuvent voir et gérer les bans de leurs lives"
ON public.live_stream_bans
FOR ALL
USING (is_live_stream_creator(live_stream_id, auth.uid()));

DROP POLICY IF EXISTS "Créateurs peuvent gérer les settings de leurs lives" ON public.live_stream_settings;

CREATE POLICY "Créateurs peuvent gérer les settings de leurs lives"
ON public.live_stream_settings
FOR ALL
USING (is_live_stream_creator(live_stream_id, auth.uid()));

-- Live stream revenue aussi
DROP POLICY IF EXISTS "Créateurs peuvent voir leurs revenus de live" ON public.live_stream_revenue;

CREATE POLICY "Créateurs peuvent voir leurs revenus de live"
ON public.live_stream_revenue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = live_stream_revenue.creator_id
    AND c.user_id = auth.uid()
  )
  OR is_admin(auth.uid())
);