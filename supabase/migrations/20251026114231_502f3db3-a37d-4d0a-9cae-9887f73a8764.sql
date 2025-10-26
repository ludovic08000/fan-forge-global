-- Supprimer les colonnes d'abonnement de la table creators qui ne sont pas utilisées
-- Les créateurs ne s'abonnent PAS à la plateforme, ce sont les utilisateurs qui s'abonnent aux créateurs

ALTER TABLE creators 
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS plan_type,
DROP COLUMN IF EXISTS subscription_active,
DROP COLUMN IF EXISTS subscription_end;

-- Ajouter une colonne pour la commission de la plateforme (15%)
ALTER TABLE creators 
ADD COLUMN IF NOT EXISTS platform_commission_rate numeric DEFAULT 0.15 CHECK (platform_commission_rate >= 0 AND platform_commission_rate <= 1);

COMMENT ON COLUMN creators.platform_commission_rate IS 'Taux de commission de la plateforme sur les revenus du créateur (par défaut 15%)';
COMMENT ON TABLE subscriptions IS 'Abonnements des utilisateurs AUX créateurs (pas abonnements des créateurs à la plateforme)';