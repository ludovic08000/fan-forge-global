-- Mettre à jour la fonction handle_new_user pour utiliser le username fourni par l'utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  provided_username TEXT;
  final_username TEXT;
BEGIN
  -- Récupérer le username fourni par l'utilisateur s'il existe
  provided_username := NEW.raw_user_meta_data->>'username';
  
  -- Si un username est fourni et valide (min 3 caractères), l'utiliser
  IF provided_username IS NOT NULL AND LENGTH(TRIM(provided_username)) >= 3 THEN
    -- Vérifier si ce username existe déjà
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = provided_username) THEN
      -- Si le username existe, ajouter un suffixe unique
      final_username := generate_unique_username(provided_username);
    ELSE
      final_username := provided_username;
    END IF;
  ELSE
    -- Sinon, générer un username à partir de l'email
    final_username := generate_unique_username(SPLIT_PART(NEW.email, '@', 1));
  END IF;
  
  -- Créer le profil avec le username
  INSERT INTO public.profiles (user_id, username, display_name)
  VALUES (
    NEW.id, 
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  RETURN NEW;
END;
$function$;