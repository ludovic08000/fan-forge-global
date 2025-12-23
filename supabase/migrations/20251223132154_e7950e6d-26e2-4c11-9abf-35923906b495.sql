-- Supprimer l'ancienne vue
DROP VIEW IF EXISTS public_live_streams;

-- Recréer la vue avec SECURITY DEFINER pour contourner les RLS
-- Cela permet à tous les utilisateurs de voir tous les lives (le floutage se fait côté frontend)
CREATE OR REPLACE VIEW public_live_streams 
WITH (security_invoker = false)
AS
SELECT 
    ls.id,
    ls.creator_id,
    ls.title,
    ls.description,
    ls.status,
    ls.thumbnail_url,
    ls.is_premium,
    ls.price,
    ls.scheduled_at,
    ls.started_at,
    ls.ended_at,
    ls.viewer_count,
    ls.peak_viewer_count,
    ls.created_at,
    ls.updated_at
FROM live_streams ls
INNER JOIN creators c ON c.id = ls.creator_id
WHERE ls.status IN ('scheduled', 'live')
  AND (c.is_paused IS NULL OR c.is_paused = false);

-- Donner accès à tous les utilisateurs authentifiés et anonymes
GRANT SELECT ON public_live_streams TO anon, authenticated;