-- Ajout des politiques RLS manquantes pour referral_uses

-- Politiques RLS pour referral_uses
CREATE POLICY "Users can view their own referral uses" ON public.referral_uses 
  FOR SELECT USING (subscriber_id = auth.uid());

CREATE POLICY "Creators can view uses of their referral codes" ON public.referral_uses 
  FOR SELECT USING (
    referral_code_id IN (
      SELECT id FROM public.referral_codes 
      WHERE creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create referral uses" ON public.referral_uses 
  FOR INSERT WITH CHECK (subscriber_id = auth.uid());

CREATE POLICY "Admins can manage all referral uses" ON public.referral_uses 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));