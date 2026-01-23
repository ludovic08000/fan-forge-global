-- Corriger la policy trop permissive sur collaborative_content
-- Remplacer FOR ALL par des policies spécifiques

DROP POLICY IF EXISTS "Primary creator can manage collaborative content" ON public.collaborative_content;

-- Policy INSERT: seul le créateur principal d'un partenariat accepté peut créer
CREATE POLICY "Primary creator can insert collaborative content"
  ON public.collaborative_content
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM creators WHERE id = primary_creator_id AND user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM creator_partnerships cp
      WHERE cp.id = partnership_id
      AND cp.status = 'accepted'
      AND (cp.requester_id = primary_creator_id OR cp.partner_id = primary_creator_id)
    )
  );

-- Policy UPDATE: seul le créateur principal peut modifier
CREATE POLICY "Primary creator can update collaborative content"
  ON public.collaborative_content
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM creators WHERE id = primary_creator_id AND user_id = auth.uid())
  );

-- Policy DELETE: seul le créateur principal peut supprimer
CREATE POLICY "Primary creator can delete collaborative content"
  ON public.collaborative_content
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM creators WHERE id = primary_creator_id AND user_id = auth.uid())
  );

-- Ajouter une policy INSERT pour partnership_revenue (système seulement via edge functions)
CREATE POLICY "System can insert partnership revenue"
  ON public.partnership_revenue
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM creator_partnerships cp
      WHERE cp.id = partnership_id
      AND cp.status = 'accepted'
      AND (
        EXISTS (SELECT 1 FROM creators WHERE id = cp.requester_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM creators WHERE id = cp.partner_id AND user_id = auth.uid())
      )
    )
  );