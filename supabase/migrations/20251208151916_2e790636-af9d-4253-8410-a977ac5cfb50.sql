-- Ajouter une policy INSERT pour permettre aux créateurs de créer leurs propres factures
CREATE POLICY "Créateurs peuvent créer leurs factures" 
ON public.creator_invoices 
FOR INSERT 
WITH CHECK (creator_id IN (
  SELECT id FROM creators WHERE user_id = auth.uid()
));