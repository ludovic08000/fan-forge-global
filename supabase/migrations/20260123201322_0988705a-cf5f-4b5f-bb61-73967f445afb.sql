-- ============================================================
-- SÉCURITÉ: Empêcher les créateurs de s'abonner/tipper d'autres créateurs
-- Les créateurs doivent avoir un compte utilisateur séparé pour ces actions
-- ============================================================

-- 1. Fonction pour vérifier si un utilisateur est un créateur actif
CREATE OR REPLACE FUNCTION public.is_active_creator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creators
    WHERE user_id = _user_id
    AND (is_paused IS NULL OR is_paused = false)
  )
$$;

-- 2. Contrainte CHECK sur la table subscriptions
-- Empêche un créateur de s'abonner à un autre créateur
ALTER TABLE public.subscriptions
ADD CONSTRAINT check_subscriber_not_creator
CHECK (
  -- Cette contrainte sera vérifiée via trigger car CHECK ne peut pas appeler de fonction
  true
);

-- 3. Trigger pour valider que l'abonné n'est pas un créateur
CREATE OR REPLACE FUNCTION public.validate_subscription_not_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'abonné est un créateur actif
  IF is_active_creator(NEW.subscriber_id) THEN
    RAISE EXCEPTION 'Les créateurs ne peuvent pas s''abonner à d''autres créateurs. Veuillez utiliser un compte utilisateur séparé.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur INSERT et UPDATE
DROP TRIGGER IF EXISTS tr_validate_subscription_not_creator ON public.subscriptions;
CREATE TRIGGER tr_validate_subscription_not_creator
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_not_creator();

-- 4. Trigger pour valider que l'envoyeur de tip n'est pas un créateur
CREATE OR REPLACE FUNCTION public.validate_tip_sender_not_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'envoyeur est un créateur actif
  IF is_active_creator(NEW.sender_id) THEN
    RAISE EXCEPTION 'Les créateurs ne peuvent pas envoyer de tips à d''autres créateurs. Veuillez utiliser un compte utilisateur séparé.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur INSERT
DROP TRIGGER IF EXISTS tr_validate_tip_sender_not_creator ON public.tips;
CREATE TRIGGER tr_validate_tip_sender_not_creator
  BEFORE INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tip_sender_not_creator();

-- 5. Trigger pour valider que l'acheteur de contenu privé n'est pas un créateur
CREATE OR REPLACE FUNCTION public.validate_private_payment_not_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'acheteur est un créateur actif
  IF is_active_creator(NEW.payer_id) THEN
    RAISE EXCEPTION 'Les créateurs ne peuvent pas acheter de contenu privé. Veuillez utiliser un compte utilisateur séparé.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur INSERT
DROP TRIGGER IF EXISTS tr_validate_private_payment_not_creator ON public.private_content_payments;
CREATE TRIGGER tr_validate_private_payment_not_creator
  BEFORE INSERT ON public.private_content_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_private_payment_not_creator();

-- 6. Trigger pour valider l'achat d'accès live
CREATE OR REPLACE FUNCTION public.validate_live_payment_not_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'acheteur est un créateur actif
  IF is_active_creator(NEW.subscriber_id) THEN
    RAISE EXCEPTION 'Les créateurs ne peuvent pas payer pour accéder aux lives d''autres créateurs. Veuillez utiliser un compte utilisateur séparé.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur INSERT
DROP TRIGGER IF EXISTS tr_validate_live_payment_not_creator ON public.live_stream_payments;
CREATE TRIGGER tr_validate_live_payment_not_creator
  BEFORE INSERT ON public.live_stream_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_live_payment_not_creator();

-- 7. Supprimer la contrainte CHECK inutile
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS check_subscriber_not_creator;