-- Bundles / Packs de contenu
CREATE TABLE public.content_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  original_price NUMERIC NOT NULL DEFAULT 0,
  bundle_price NUMERIC NOT NULL DEFAULT 0,
  discount_percentage INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'active',
  cover_url TEXT,
  sales_count INTEGER NOT NULL DEFAULT 0,
  max_sales INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.content_bundles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, content_id)
);

CREATE TABLE public.bundle_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.content_bundles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles" ON public.content_bundles
  FOR SELECT USING (status = 'active' OR is_own_creator_profile(creator_id));

CREATE POLICY "Creators can manage their bundles" ON public.content_bundles
  FOR INSERT WITH CHECK (is_own_creator_profile(creator_id));

CREATE POLICY "Creators can update their bundles" ON public.content_bundles
  FOR UPDATE USING (is_own_creator_profile(creator_id));

CREATE POLICY "Creators can delete their bundles" ON public.content_bundles
  FOR DELETE USING (is_own_creator_profile(creator_id));

CREATE POLICY "Anyone can view bundle items" ON public.bundle_items
  FOR SELECT USING (true);

CREATE POLICY "Creators can manage bundle items" ON public.bundle_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM content_bundles WHERE id = bundle_id AND is_own_creator_profile(creator_id))
  );

CREATE POLICY "Creators can delete bundle items" ON public.bundle_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM content_bundles WHERE id = bundle_id AND is_own_creator_profile(creator_id))
  );

CREATE POLICY "Buyers can view their purchases" ON public.bundle_purchases
  FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Creators can view their bundle sales" ON public.bundle_purchases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM content_bundles WHERE id = bundle_id AND is_own_creator_profile(creator_id))
  );

CREATE POLICY "System can insert purchases" ON public.bundle_purchases
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE TRIGGER update_content_bundles_updated_at
  BEFORE UPDATE ON public.content_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_bundle_purchase()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _creator_user_id UUID;
  _buyer_name TEXT;
  _bundle_title TEXT;
BEGIN
  SELECT cb.title, c.user_id INTO _bundle_title, _creator_user_id
  FROM content_bundles cb
  JOIN creators c ON c.id = cb.creator_id
  WHERE cb.id = NEW.bundle_id;

  SELECT COALESCE(display_name, username, 'Un fan') INTO _buyer_name
  FROM profiles WHERE user_id = NEW.buyer_id;

  IF NEW.status = 'paid' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      _creator_user_id,
      'sale',
      'Bundle vendu ! 🎁',
      _buyer_name || ' a acheté "' || COALESCE(_bundle_title, 'Pack') || '" pour ' || NEW.amount || '€',
      jsonb_build_object('bundle_id', NEW.bundle_id, 'buyer_id', NEW.buyer_id, 'amount', NEW.amount)
    );
    UPDATE content_bundles SET sales_count = sales_count + 1 WHERE id = NEW.bundle_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_bundle_purchase_paid
  AFTER INSERT OR UPDATE ON public.bundle_purchases
  FOR EACH ROW EXECUTE FUNCTION public.notify_bundle_purchase();