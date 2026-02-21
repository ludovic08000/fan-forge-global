
-- Supprimer la policy trop permissive et la remplacer
DROP POLICY IF EXISTS "System can insert via service role" ON public.legal_evidence_archives;
DROP POLICY IF EXISTS "Only admins can insert legal evidence" ON public.legal_evidence_archives;

-- Seule policy d'insertion: admins uniquement (service_role bypass RLS de toute façon)
CREATE POLICY "Admins can insert legal evidence"
ON public.legal_evidence_archives FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
