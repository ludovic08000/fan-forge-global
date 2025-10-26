-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.generate_unique_username(text);

-- Fonction pour générer un username unique à partir du stage_name
CREATE OR REPLACE FUNCTION public.generate_unique_username(base_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Nettoyer et normaliser le texte
  base_username := LOWER(REGEXP_REPLACE(base_text, '[^a-z0-9]', '', 'g'));
  
  -- Limiter à 20 caractères
  base_username := SUBSTRING(base_username FROM 1 FOR 20);
  
  -- Si vide après nettoyage, utiliser 'user'
  IF base_username = '' THEN
    base_username := 'user';
  END IF;
  
  -- Essayer le username de base
  final_username := base_username;
  
  -- Si déjà pris, ajouter un numéro
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- Modifier le trigger pour utiliser l'email temporairement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Créer le profil avec username temporaire basé sur l'email
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id, 
    generate_unique_username(SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  RETURN NEW;
END;
$$;

-- Créer un trigger pour mettre à jour le username quand un créateur est créé
CREATE OR REPLACE FUNCTION public.update_username_from_stage_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Mettre à jour le username avec le stage_name si fourni
  IF NEW.stage_name IS NOT NULL AND NEW.stage_name != '' THEN
    UPDATE public.profiles
    SET username = generate_unique_username(NEW.stage_name)
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table creators
DROP TRIGGER IF EXISTS on_creator_created ON public.creators;
CREATE TRIGGER on_creator_created
  AFTER INSERT ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_username_from_stage_name();

-- Créer aussi un trigger pour les updates du stage_name
DROP TRIGGER IF EXISTS on_creator_stage_name_updated ON public.creators;
CREATE TRIGGER on_creator_stage_name_updated
  AFTER UPDATE OF stage_name ON public.creators
  FOR EACH ROW
  WHEN (OLD.stage_name IS DISTINCT FROM NEW.stage_name)
  EXECUTE FUNCTION public.update_username_from_stage_name();