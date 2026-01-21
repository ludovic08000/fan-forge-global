-- Améliorer la fonction de génération de username propre
CREATE OR REPLACE FUNCTION public.generate_unique_username(base_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Nettoyer le texte: convertir en minuscules et remplacer les espaces par des tirets
  base_username := LOWER(TRIM(base_text));
  
  -- Remplacer les espaces et caractères spéciaux par des tirets
  base_username := REGEXP_REPLACE(base_username, '\s+', '-', 'g');
  
  -- Convertir les caractères accentués en équivalents non accentués
  base_username := TRANSLATE(base_username, 
    'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ',
    'aaaaaaaceeeeiiiidnoooooouuuuyty');
  
  -- Ne garder que les lettres, chiffres et tirets
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9-]', '', 'g');
  
  -- Supprimer les tirets multiples consécutifs
  base_username := REGEXP_REPLACE(base_username, '-+', '-', 'g');
  
  -- Supprimer les tirets au début et à la fin
  base_username := TRIM(BOTH '-' FROM base_username);
  
  -- Limiter à 30 caractères (plus raisonnable)
  base_username := SUBSTRING(base_username FROM 1 FOR 30);
  
  -- Si vide après nettoyage, utiliser 'user'
  IF base_username = '' OR base_username IS NULL THEN
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

-- Améliorer le trigger pour mettre à jour le username depuis stage_name
CREATE OR REPLACE FUNCTION public.update_username_from_stage_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_username TEXT;
BEGIN
  -- Mettre à jour le username avec le stage_name si fourni et différent
  IF NEW.stage_name IS NOT NULL AND NEW.stage_name != '' THEN
    -- Générer un username propre basé sur le stage_name
    new_username := generate_unique_username(NEW.stage_name);
    
    -- Mettre à jour le profil
    UPDATE public.profiles
    SET username = new_username
    WHERE user_id = NEW.user_id
    AND (username IS NULL OR username = '' OR username LIKE 'user%');
  END IF;
  
  RETURN NEW;
END;
$$;