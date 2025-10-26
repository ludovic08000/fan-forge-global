-- Fonction pour générer un username unique à partir de l'email
CREATE OR REPLACE FUNCTION public.generate_unique_username(email TEXT)
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
  -- Extraire la partie avant le @ de l'email et nettoyer
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9]', '', 'g'));
  
  -- Limiter à 20 caractères
  base_username := SUBSTRING(base_username FROM 1 FOR 20);
  
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

-- Modifier le trigger handle_new_user pour créer automatiquement un username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Créer le profil avec username auto-généré
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id, 
    generate_unique_username(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  RETURN NEW;
END;
$$;