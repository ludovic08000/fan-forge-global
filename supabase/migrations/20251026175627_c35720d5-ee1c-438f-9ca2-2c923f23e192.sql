-- Temporairement désactiver les contraintes pour insérer des données de test
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.creators DROP CONSTRAINT IF EXISTS creators_user_id_fkey;

-- Insérer les données de test
DO $$
DECLARE
  v_user_id UUID;
  v_creator_id UUID;
BEGIN
  -- Créateur 1: Femme fitness
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'fitnessmaya', 'Maya Fitness', 'Coach sportive passionnée | Yoga & Pilates | Lifestyle sain 🧘‍♀️', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', true, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'Maya Fitness', 'fitness', 9.99, 'EUR', 'femme', 'hétéro', ARRAY['photo', 'vidéo', 'live'], true, 1250, 15, now());

  -- Créateur 2: Homme photographe  
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'alexphoto', 'Alex Photography', 'Photographe professionnel | Art & Nature | Paris 📸', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', true, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'Alex Photography', 'photographie', 14.99, 'EUR', 'homme', 'hétéro', ARRAY['photo'], false, 890, 45, now());

  -- Créateur 3: Femme artiste
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'sophieart', 'Sophie Creative', 'Artiste peintre | Art contemporain | Créations originales 🎨', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', false, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'Sophie Creative', 'art', 0.00, 'EUR', 'femme', 'hétéro', ARRAY['photo', 'story'], false, 340, 28, now());

  -- Créateur 4: Couple lifestyle
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'couple_voyage', 'Emma & Lucas', 'Couple de voyageurs | Aventures autour du monde 🌍', 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400', true, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'Emma & Lucas', 'voyage', 12.99, 'EUR', NULL, 'couple', ARRAY['photo', 'vidéo', 'story'], false, 2100, 67, now());

  -- Créateur 5: Homme cuisinier
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'chef_thomas', 'Chef Thomas', 'Chef cuisinier | Recettes gourmandes | Cuisine française 👨‍🍳', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', false, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'Chef Thomas', 'cuisine', 7.99, 'EUR', 'homme', 'hétéro', ARRAY['vidéo', 'live'], false, 560, 34, now());

  -- Créateur 6: Femme mode
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'fashion_clara', 'Clara Fashion', 'Styliste mode | Tendances & Style | Paris Fashion Week 👗', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', true, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'Clara Fashion', 'mode', 19.99, 'EUR', 'femme', 'hétéro', ARRAY['photo', 'story'], true, 1800, 89, now());

  -- Créateur 7: Homme musicien
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'dj_martin', 'DJ Martin', 'DJ & Producteur | Musique électronique | Live sessions 🎧', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', false, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'DJ Martin', 'musique', 0.00, 'EUR', 'homme', 'hétéro', ARRAY['vidéo', 'live'], false, 720, 23, now());

  -- Créateur 8: Femme wellness
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (id, user_id, username, display_name, bio, avatar_url, is_verified, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'zen_marie', 'Marie Zen', 'Coach bien-être | Méditation & Relaxation | Harmonie intérieure 🌸', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', true, now());
  
  INSERT INTO public.creators (id, user_id, stage_name, category, subscription_price, currency, gender, orientation, content_type, is_featured, total_subscribers, total_content, created_at)
  VALUES (gen_random_uuid(), v_user_id, 'Marie Zen', 'bien-être', 9.99, 'EUR', 'femme', 'hétéro', ARRAY['photo', 'vidéo'], false, 980, 41, now());
  
END $$;

-- Réactiver les contraintes (NOT VALID pour éviter les erreurs sur les données existantes)
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;

ALTER TABLE public.creators 
  ADD CONSTRAINT creators_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  NOT VALID;