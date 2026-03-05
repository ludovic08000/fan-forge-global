-- Supprimer l'ancienne contrainte (0-1)
ALTER TABLE creators DROP CONSTRAINT creators_platform_commission_rate_check;

-- Ajouter la nouvelle contrainte (0-100, entier représentant un pourcentage)
ALTER TABLE creators ADD CONSTRAINT creators_platform_commission_rate_check 
  CHECK (platform_commission_rate >= 0 AND platform_commission_rate <= 100);

-- Mettre à jour les valeurs existantes de 0.15 vers 15
UPDATE creators SET platform_commission_rate = 15 WHERE platform_commission_rate < 1;

-- Mettre le défaut à 15
ALTER TABLE creators ALTER COLUMN platform_commission_rate SET DEFAULT 15;

-- Mettre à jour les factures existantes
UPDATE creator_invoices SET platform_commission_rate = 15 WHERE platform_commission_rate < 1;