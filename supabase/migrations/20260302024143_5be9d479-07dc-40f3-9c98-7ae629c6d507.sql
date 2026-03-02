-- =============================================
-- WISHLIST / CROWDFUNDING
-- =============================================
CREATE TABLE public.creator_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  reward_description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.wishlist_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wishlist_id UUID NOT NULL REFERENCES public.creator_wishlists(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active wishlists" ON public.creator_wishlists
  FOR SELECT USING (status = 'active' OR is_own_creator_profile(creator_id));
CREATE POLICY "Creators manage wishlists" ON public.creator_wishlists
  FOR INSERT WITH CHECK (is_own_creator_profile(creator_id));
CREATE POLICY "Creators update wishlists" ON public.creator_wishlists
  FOR UPDATE USING (is_own_creator_profile(creator_id));
CREATE POLICY "Creators delete wishlists" ON public.creator_wishlists
  FOR DELETE USING (is_own_creator_profile(creator_id));

CREATE POLICY "Anyone can view paid contributions" ON public.wishlist_contributions
  FOR SELECT USING (
    status = 'paid' OR contributor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM creator_wishlists w WHERE w.id = wishlist_id AND is_own_creator_profile(w.creator_id))
  );
CREATE POLICY "Users can contribute" ON public.wishlist_contributions
  FOR INSERT WITH CHECK (contributor_id = auth.uid());

CREATE TRIGGER update_wishlists_updated_at BEFORE UPDATE ON public.creator_wishlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SONDAGES / POLLS
-- =============================================
CREATE TABLE public.creator_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  vote_price NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  subscribers_only BOOLEAN NOT NULL DEFAULT true,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  total_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.creator_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.creator_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);

ALTER TABLE public.creator_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active polls" ON public.creator_polls
  FOR SELECT USING (status = 'active' OR is_own_creator_profile(creator_id));
CREATE POLICY "Creators manage polls" ON public.creator_polls
  FOR INSERT WITH CHECK (is_own_creator_profile(creator_id));
CREATE POLICY "Creators update polls" ON public.creator_polls
  FOR UPDATE USING (is_own_creator_profile(creator_id));
CREATE POLICY "Creators delete polls" ON public.creator_polls
  FOR DELETE USING (is_own_creator_profile(creator_id));

CREATE POLICY "Anyone can view poll options" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Creators manage poll options" ON public.poll_options
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM creator_polls WHERE id = poll_id AND is_own_creator_profile(creator_id)));

CREATE POLICY "Users can view their votes" ON public.poll_votes FOR SELECT USING (voter_id = auth.uid());
CREATE POLICY "Creators can view votes" ON public.poll_votes
  FOR SELECT USING (EXISTS (SELECT 1 FROM creator_polls WHERE id = poll_id AND is_own_creator_profile(creator_id)));
CREATE POLICY "Users can vote" ON public.poll_votes
  FOR INSERT WITH CHECK (voter_id = auth.uid());

-- Atomic vote function
CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_poll_id UUID, p_option_id UUID)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_poll RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;

  SELECT * INTO v_poll FROM creator_polls WHERE id = p_poll_id FOR UPDATE;
  IF v_poll IS NULL THEN RAISE EXCEPTION 'Sondage introuvable'; END IF;
  IF v_poll.status != 'active' THEN RAISE EXCEPTION 'Sondage terminé'; END IF;
  IF v_poll.ends_at IS NOT NULL AND v_poll.ends_at <= now() THEN RAISE EXCEPTION 'Sondage expiré'; END IF;

  IF EXISTS (SELECT 1 FROM poll_votes WHERE poll_id = p_poll_id AND voter_id = v_user_id) THEN
    RAISE EXCEPTION 'Vous avez déjà voté';
  END IF;

  IF v_poll.subscribers_only AND NOT EXISTS (
    SELECT 1 FROM subscriptions WHERE subscriber_id = v_user_id AND creator_id = v_poll.creator_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Réservé aux abonnés';
  END IF;

  INSERT INTO poll_votes (poll_id, option_id, voter_id) VALUES (p_poll_id, p_option_id, v_user_id);
  UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = p_option_id;
  UPDATE creator_polls SET total_votes = total_votes + 1 WHERE id = p_poll_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.creator_polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- GAMIFICATION / BADGES
-- =============================================
CREATE TABLE public.badge_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT NOT NULL DEFAULT 'engagement',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.badge_definitions FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON public.badge_definitions
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view user badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System awards badges" ON public.user_badges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Seed default badges
INSERT INTO public.badge_definitions (name, description, icon, category, requirement_type, requirement_value) VALUES
  ('Premier pas', 'Premier abonnement souscrit', '👶', 'engagement', 'subscriptions', 1),
  ('Fan fidèle', '5 abonnements actifs', '💎', 'engagement', 'subscriptions', 5),
  ('Généreux', 'Premier pourboire envoyé', '💝', 'tipping', 'tips_sent', 1),
  ('Mécène', '10 pourboires envoyés', '🎩', 'tipping', 'tips_sent', 10),
  ('Commentateur', '50 messages envoyés', '💬', 'social', 'messages_sent', 50),
  ('Collectionneur', '5 contenus achetés', '🎯', 'purchases', 'content_purchased', 5),
  ('Early Bird', 'Inscrit dans les 1000 premiers', '🐦', 'special', 'early_adopter', 1000),
  ('Enchérisseur', 'Première enchère gagnée', '🔨', 'auctions', 'auctions_won', 1),
  ('Votant', '10 votes dans des sondages', '🗳️', 'social', 'polls_voted', 10),
  ('Supporter', 'Contribution à un projet wishlist', '⭐', 'crowdfunding', 'wishlist_contributed', 1);