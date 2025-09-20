-- Création de la base de données complète pour la plateforme de contenu premium

-- Enum pour le statut de contenu
DO $$ BEGIN
    CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum pour le type de contenu
DO $$ BEGIN
    CREATE TYPE public.content_type AS ENUM ('image', 'video');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum pour le statut d'abonnement
DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table des profils utilisateurs étendus
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  location TEXT,
  website TEXT,
  birthdate DATE,
  phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des créateurs avec informations spécifiques
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_name TEXT,
  category TEXT,
  subscription_price DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'EUR',
  is_accepting_tips BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMP WITH TIME ZONE,
  total_earnings DECIMAL(15,2) DEFAULT 0.00,
  total_subscribers INTEGER DEFAULT 0,
  total_content INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table du contenu (photos/vidéos)
CREATE TABLE IF NOT EXISTS public.content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type content_type NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  price DECIMAL(10,2) DEFAULT 0.00,
  status content_status DEFAULT 'published',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  duration INTEGER, -- Pour les vidéos (en secondes)
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des abonnements
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  status subscription_status DEFAULT 'active',
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, creator_id)
);

-- Table des codes de parrainage
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_percentage INTEGER DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des utilisations de codes de parrainage
CREATE TABLE IF NOT EXISTS public.referral_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  discount_applied DECIMAL(10,2),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des pourboires
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  content_id UUID REFERENCES public.content(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  message TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des vues de contenu pour les statistiques
CREATE TABLE IF NOT EXISTS public.content_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  view_duration INTEGER, -- En secondes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des likes de contenu
CREATE TABLE IF NOT EXISTS public.content_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, user_id)
);

-- Table des followers/following
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, creator_id)
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier si un utilisateur est abonné à un créateur
CREATE OR REPLACE FUNCTION public.is_subscribed_to_creator(_subscriber_id UUID, _creator_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE subscriber_id = _subscriber_id
      AND creator_id = _creator_id
      AND status = 'active'
      AND (end_date IS NULL OR end_date > NOW())
  )
$$;

-- Politiques RLS pour profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour creators
DROP POLICY IF EXISTS "Everyone can view creators" ON public.creators;
DROP POLICY IF EXISTS "Creators can update own profile" ON public.creators;
DROP POLICY IF EXISTS "Users can become creators" ON public.creators;

CREATE POLICY "Everyone can view creators" ON public.creators FOR SELECT USING (true);
CREATE POLICY "Creators can update own profile" ON public.creators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can become creators" ON public.creators FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques RLS pour content
DROP POLICY IF EXISTS "Everyone can view published free content" ON public.content;
DROP POLICY IF EXISTS "Subscribers can view premium content" ON public.content;
DROP POLICY IF EXISTS "Creators can manage own content" ON public.content;

CREATE POLICY "Everyone can view published free content" ON public.content 
  FOR SELECT USING (status = 'published' AND is_premium = false);

CREATE POLICY "Subscribers can view premium content" ON public.content 
  FOR SELECT USING (
    status = 'published' AND 
    (is_premium = false OR 
     public.is_subscribed_to_creator(auth.uid(), creator_id))
  );

CREATE POLICY "Creators can manage own content" ON public.content 
  FOR ALL USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

-- Politiques RLS pour subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Creators can view their subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions 
  FOR SELECT USING (subscriber_id = auth.uid());

CREATE POLICY "Creators can view their subscriptions" ON public.subscriptions 
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create subscriptions" ON public.subscriptions 
  FOR INSERT WITH CHECK (subscriber_id = auth.uid());

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions 
  FOR UPDATE USING (subscriber_id = auth.uid());

-- Politiques RLS pour referral_codes
DROP POLICY IF EXISTS "Creators can manage own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Everyone can view active referral codes" ON public.referral_codes;

CREATE POLICY "Creators can manage own referral codes" ON public.referral_codes 
  FOR ALL USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY "Everyone can view active referral codes" ON public.referral_codes 
  FOR SELECT USING (is_active = true);

-- Politiques RLS pour tips
DROP POLICY IF EXISTS "Users can view own tips" ON public.tips;
DROP POLICY IF EXISTS "Creators can view received tips" ON public.tips;
DROP POLICY IF EXISTS "Users can send tips" ON public.tips;

CREATE POLICY "Users can view own tips" ON public.tips 
  FOR SELECT USING (sender_id = auth.uid());

CREATE POLICY "Creators can view received tips" ON public.tips 
  FOR SELECT USING (
    creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send tips" ON public.tips 
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Politiques RLS pour content_views
DROP POLICY IF EXISTS "Users can view own views" ON public.content_views;
DROP POLICY IF EXISTS "Creators can view content views" ON public.content_views;
DROP POLICY IF EXISTS "Anyone can log views" ON public.content_views;

CREATE POLICY "Users can view own views" ON public.content_views 
  FOR SELECT USING (viewer_id = auth.uid());

CREATE POLICY "Creators can view content views" ON public.content_views 
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM public.content 
      WHERE creator_id IN (SELECT id FROM public.creators WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can log views" ON public.content_views 
  FOR INSERT WITH CHECK (viewer_id = auth.uid() OR viewer_id IS NULL);

-- Politiques RLS pour content_likes
DROP POLICY IF EXISTS "Users can manage own likes" ON public.content_likes;
DROP POLICY IF EXISTS "Everyone can view likes" ON public.content_likes;

CREATE POLICY "Users can manage own likes" ON public.content_likes 
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Everyone can view likes" ON public.content_likes 
  FOR SELECT USING (true);

-- Politiques RLS pour follows
DROP POLICY IF EXISTS "Users can manage own follows" ON public.follows;
DROP POLICY IF EXISTS "Everyone can view follows" ON public.follows;

CREATE POLICY "Users can manage own follows" ON public.follows 
  FOR ALL USING (follower_id = auth.uid());

CREATE POLICY "Everyone can view follows" ON public.follows 
  FOR SELECT USING (true);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_creators_updated_at ON public.creators;
CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_content_updated_at ON public.content;
CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_creators_user_id ON public.creators(user_id);
CREATE INDEX IF NOT EXISTS idx_creators_featured ON public.creators(is_featured);
CREATE INDEX IF NOT EXISTS idx_content_creator_id ON public.content(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON public.content(status);
CREATE INDEX IF NOT EXISTS idx_content_premium ON public.content(is_premium);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_id ON public.subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_id ON public.subscriptions(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_content_views_content_id ON public.content_views(content_id);
CREATE INDEX IF NOT EXISTS idx_content_views_viewer_id ON public.content_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_tips_creator_id ON public.tips(creator_id);
CREATE INDEX IF NOT EXISTS idx_tips_sender_id ON public.tips(sender_id);