
-- Table des enchères de contenu
CREATE TABLE public.content_auctions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT, -- URL R2 du contenu mis aux enchères (si pas lié à un content existant)
  media_type TEXT DEFAULT 'image', -- image, video
  starting_price NUMERIC NOT NULL DEFAULT 5.00,
  current_price NUMERIC NOT NULL DEFAULT 5.00,
  min_increment NUMERIC NOT NULL DEFAULT 1.00,
  bid_count INTEGER NOT NULL DEFAULT 0,
  winner_id UUID,
  status TEXT NOT NULL DEFAULT 'active', -- active, ended, cancelled, paid
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des enchères individuelles
CREATE TABLE public.auction_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.content_auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_content_auctions_creator ON public.content_auctions(creator_id);
CREATE INDEX idx_content_auctions_status ON public.content_auctions(status);
CREATE INDEX idx_content_auctions_ends_at ON public.content_auctions(ends_at);
CREATE INDEX idx_auction_bids_auction ON public.auction_bids(auction_id);
CREATE INDEX idx_auction_bids_bidder ON public.auction_bids(bidder_id);

-- RLS
ALTER TABLE public.content_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- Policies content_auctions
CREATE POLICY "Anyone authenticated can view active auctions"
  ON public.content_auctions FOR SELECT
  USING (auth.uid() IS NOT NULL AND (status = 'active' OR status = 'ended'));

CREATE POLICY "Creators can view all their auctions"
  ON public.content_auctions FOR SELECT
  USING (EXISTS (SELECT 1 FROM creators WHERE creators.id = content_auctions.creator_id AND creators.user_id = auth.uid()));

CREATE POLICY "Admins can view all auctions"
  ON public.content_auctions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Creators can create auctions"
  ON public.content_auctions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM creators WHERE creators.id = content_auctions.creator_id AND creators.user_id = auth.uid()));

CREATE POLICY "Creators can update own auctions"
  ON public.content_auctions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM creators WHERE creators.id = content_auctions.creator_id AND creators.user_id = auth.uid()));

CREATE POLICY "Creators can delete draft auctions"
  ON public.content_auctions FOR DELETE
  USING (status = 'cancelled' AND EXISTS (SELECT 1 FROM creators WHERE creators.id = content_auctions.creator_id AND creators.user_id = auth.uid()));

-- Policies auction_bids
CREATE POLICY "Authenticated users can view bids on active auctions"
  ON public.auction_bids FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Subscribers can place bids"
  ON public.auction_bids FOR INSERT
  WITH CHECK (
    auth.uid() = bidder_id
    AND NOT is_active_creator(auth.uid())
    AND EXISTS (
      SELECT 1 FROM content_auctions ca
      WHERE ca.id = auction_bids.auction_id
      AND ca.status = 'active'
      AND ca.ends_at > now()
    )
  );

-- Trigger updated_at
CREATE TRIGGER update_content_auctions_updated_at
  BEFORE UPDATE ON public.content_auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function pour placer une enchère avec validation atomique
CREATE OR REPLACE FUNCTION public.place_auction_bid(
  p_auction_id UUID,
  p_amount NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_auction RECORD;
  v_bid_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Vérifier que l'utilisateur n'est pas un créateur
  IF is_active_creator(v_user_id) THEN
    RAISE EXCEPTION 'Les créateurs ne peuvent pas enchérir';
  END IF;

  -- Verrouiller l'enchère pour éviter les race conditions
  SELECT * INTO v_auction
  FROM content_auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF v_auction IS NULL THEN
    RAISE EXCEPTION 'Enchère introuvable';
  END IF;

  IF v_auction.status != 'active' THEN
    RAISE EXCEPTION 'Cette enchère n''est plus active';
  END IF;

  IF v_auction.ends_at <= now() THEN
    RAISE EXCEPTION 'Cette enchère est terminée';
  END IF;

  -- Vérifier que l'utilisateur est abonné au créateur
  IF NOT is_subscribed_to_creator(v_user_id, v_auction.creator_id) THEN
    RAISE EXCEPTION 'Vous devez être abonné pour enchérir';
  END IF;

  -- Vérifier le montant minimum
  IF p_amount < v_auction.current_price + v_auction.min_increment THEN
    RAISE EXCEPTION 'Le montant minimum est de %€', v_auction.current_price + v_auction.min_increment;
  END IF;

  -- Vérifier que l'utilisateur ne surenchérit pas sur lui-même
  IF v_auction.winner_id = v_user_id THEN
    RAISE EXCEPTION 'Vous êtes déjà le meilleur enchérisseur';
  END IF;

  -- Insérer l'enchère
  INSERT INTO auction_bids (auction_id, bidder_id, amount)
  VALUES (p_auction_id, v_user_id, p_amount)
  RETURNING id INTO v_bid_id;

  -- Mettre à jour l'enchère
  UPDATE content_auctions
  SET current_price = p_amount,
      winner_id = v_user_id,
      bid_count = bid_count + 1
  WHERE id = p_auction_id;

  RETURN jsonb_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'new_price', p_amount,
    'bid_count', v_auction.bid_count + 1
  );
END;
$$;

-- Function pour finaliser les enchères expirées
CREATE OR REPLACE FUNCTION public.finalize_expired_auctions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  finalized_count INTEGER := 0;
BEGIN
  UPDATE content_auctions
  SET status = 'ended'
  WHERE status = 'active'
  AND ends_at <= now()
  AND winner_id IS NOT NULL;

  GET DIAGNOSTICS finalized_count = ROW_COUNT;

  -- Annuler les enchères sans enchérisseur
  UPDATE content_auctions
  SET status = 'cancelled'
  WHERE status = 'active'
  AND ends_at <= now()
  AND winner_id IS NULL;

  RETURN finalized_count;
END;
$$;

-- Notification au créateur quand quelqu'un enchérit
CREATE OR REPLACE FUNCTION public.notify_auction_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator_user_id UUID;
  _bidder_name TEXT;
  _auction_title TEXT;
BEGIN
  SELECT ca.title, c.user_id INTO _auction_title, _creator_user_id
  FROM content_auctions ca
  JOIN creators c ON c.id = ca.creator_id
  WHERE ca.id = NEW.auction_id;

  SELECT COALESCE(display_name, username, 'Un abonné') INTO _bidder_name
  FROM profiles WHERE user_id = NEW.bidder_id;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    _creator_user_id,
    'auction_bid',
    'Nouvelle enchère ! 🔥',
    _bidder_name || ' a enchéri ' || NEW.amount || '€ sur "' || COALESCE(_auction_title, 'Enchère') || '"',
    jsonb_build_object('auction_id', NEW.auction_id, 'bidder_id', NEW.bidder_id, 'amount', NEW.amount)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auction_bid_notify
  AFTER INSERT ON public.auction_bids
  FOR EACH ROW EXECUTE FUNCTION public.notify_auction_bid();
