
-- ========================================
-- RENFORCEMENT DE LA VÉRIFICATION DE PAIEMENT POUR LES MESSAGES PRIVÉS
-- ========================================

-- Améliorer la politique pour vérifier le paiement via la table private_content_payments
DROP POLICY IF EXISTS "Users can view messages with payment check" ON public.private_messages;

CREATE POLICY "Users can view messages with verified payment"
  ON public.private_messages
  FOR SELECT
  USING (
    (is_deleted = false OR is_deleted IS NULL)
    AND (
      -- Le créateur peut tout voir
      creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
      OR
      -- L'abonné peut voir ses messages avec vérification de paiement stricte
      (
        subscriber_id = auth.uid()
        AND (
          -- Message gratuit ou sans prix
          price IS NULL OR price = 0
          OR
          -- Message payé ET vérifié dans private_content_payments
          (
            is_paid = true
            AND EXISTS (
              SELECT 1 FROM private_content_payments pcp
              WHERE pcp.message_id = private_messages.id
              AND pcp.subscriber_id = auth.uid()
              AND pcp.status = 'paid'
            )
          )
        )
      )
      OR
      -- Admin
      has_role(auth.uid(), 'admin'::user_role)
    )
  );

-- ========================================
-- AJOUTER RLS AUX VUES PUBLIQUES (optionnel - mode authentifié)
-- Les vues sont intentionnellement publiques pour permettre aux visiteurs
-- de découvrir les créateurs, mais on peut les restreindre aux utilisateurs auth
-- ========================================

-- Note: Les vues avec SECURITY INVOKER héritent des politiques de leurs tables sources
-- On garde les vues publiques pour le SEO et la découverte, mais on documente la décision

COMMENT ON VIEW public.public_creators IS 'Vue publique intentionnelle pour permettre la découverte de créateurs par les visiteurs non-authentifiés. Exclut les données financières sensibles.';

COMMENT ON VIEW public.public_creator_profiles IS 'Vue publique intentionnelle pour les profils créateurs visibles par tous. Exclut phone, birthdate, orientation.';

COMMENT ON VIEW public.public_creators_safe IS 'Vue publique sécurisée sans données bancaires ni earnings. Intentionnellement accessible pour le SEO.';

COMMENT ON VIEW public.public_profiles_safe IS 'Vue publique pour profils sans données sensibles. Intentionnellement accessible pour la découverte.';

COMMENT ON VIEW public.public_live_streams IS 'Vue publique pour les lives - permet aux visiteurs de voir les lives disponibles.';

-- ========================================
-- RENFORCER LA FONCTION is_subscribed_to_creator POUR VÉRIFIER LES PAIEMENTS
-- ========================================

CREATE OR REPLACE FUNCTION public.is_subscribed_to_creator(_subscriber_id uuid, _creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.subscriber_id = _subscriber_id
      AND s.creator_id = _creator_id
      AND s.status = 'active'
      AND (s.end_date IS NULL OR s.end_date > NOW())
      -- Vérification additionnelle: doit avoir un stripe_subscription_id valide
      -- ou être un abonnement gratuit
      AND (
        s.stripe_subscription_id IS NOT NULL
        OR s.price = 0
      )
  )
$$;

-- ========================================
-- INDEX POUR OPTIMISER LES VÉRIFICATIONS DE PAIEMENT
-- ========================================

CREATE INDEX IF NOT EXISTS idx_private_content_payments_message_id ON public.private_content_payments(message_id);
CREATE INDEX IF NOT EXISTS idx_private_content_payments_subscriber_status ON public.private_content_payments(subscriber_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_creator_status ON public.subscriptions(subscriber_id, creator_id, status);
