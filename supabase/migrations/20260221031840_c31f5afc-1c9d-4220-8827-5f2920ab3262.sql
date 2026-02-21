
-- Correction du trigger : identité serveur, verrouillage anti-concurrence, 365 jours glissants
CREATE OR REPLACE FUNCTION public.validate_one_free_code_per_year()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _creator_user_id UUID;
  _authenticated_user_id UUID;
BEGIN
  -- A) Utiliser l'identité serveur (auth.uid()), pas le champ envoyé par le client
  _authenticated_user_id := auth.uid();
  
  -- Récupérer le user_id du créateur associé à ce code
  SELECT user_id INTO _creator_user_id
  FROM creators
  WHERE id = NEW.creator_id;

  -- Vérifier que l'utilisateur authentifié est bien le propriétaire du créateur
  -- (sauf si appelé par service_role, où auth.uid() est NULL)
  IF _authenticated_user_id IS NOT NULL AND _creator_user_id != _authenticated_user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez créer des codes que pour votre propre profil créateur.';
  END IF;

  -- Vérifier seulement les codes gratuits (100%)
  IF NEW.discount_percentage = 100 THEN
    -- B) Verrouillage advisory pour éviter les double inserts concurrents
    -- Le lock est basé sur le creator_id (converti en bigint via hashtext)
    PERFORM pg_advisory_xact_lock(hashtext(NEW.creator_id::text || '_free_code'));

    -- C) 365 jours glissants (UTC, précis)
    IF EXISTS (
      SELECT 1 FROM referral_codes
      WHERE creator_id = NEW.creator_id
        AND discount_percentage = 100
        AND created_at > (NOW() AT TIME ZONE 'UTC') - INTERVAL '365 days'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Un seul code gratuit est autorisé par an (365 jours glissants). Veuillez attendre que le délai expire.';
    END IF;
  END IF;

  -- Forcer duration_months à max 2
  IF NEW.duration_months IS NOT NULL AND NEW.duration_months > 2 THEN
    NEW.duration_months := 2;
  END IF;

  RETURN NEW;
END;
$$;
