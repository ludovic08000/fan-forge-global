
-- Fonction de validation : 1 code gratuit (100%) par an par créateur
CREATE OR REPLACE FUNCTION public.validate_one_free_code_per_year()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Vérifier seulement les codes gratuits (100%)
  IF NEW.discount_percentage = 100 THEN
    -- Chercher si un code gratuit existe déjà dans les 12 derniers mois pour ce créateur
    IF EXISTS (
      SELECT 1 FROM referral_codes
      WHERE creator_id = NEW.creator_id
        AND discount_percentage = 100
        AND created_at > NOW() - INTERVAL '1 year'
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Un seul code gratuit est autorisé par an. Veuillez attendre 12 mois après la création du dernier code gratuit.';
    END IF;
  END IF;

  -- Vérifier aussi que duration_months ne dépasse pas 2
  IF NEW.duration_months IS NOT NULL AND NEW.duration_months > 2 THEN
    NEW.duration_months := 2;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger sur INSERT et UPDATE
DROP TRIGGER IF EXISTS check_one_free_code_per_year ON referral_codes;
CREATE TRIGGER check_one_free_code_per_year
  BEFORE INSERT OR UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_one_free_code_per_year();
