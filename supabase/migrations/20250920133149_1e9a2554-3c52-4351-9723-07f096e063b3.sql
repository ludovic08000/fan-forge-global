-- Ajouter les nouveaux champs aux créateurs pour les filtres avancés
ALTER TABLE creators ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('femme', 'homme', 'non-binaire', 'trans'));
ALTER TABLE creators ADD COLUMN IF NOT EXISTS orientation text CHECK (orientation IN ('lesbienne', 'bi', 'gay', 'hétéro', 'couple', 'trans'));
ALTER TABLE creators ADD COLUMN IF NOT EXISTS content_type text[] DEFAULT ARRAY[]::text[]; -- photo, vidéo, live, story, tips

-- Ajouter un index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_creators_gender ON creators(gender);
CREATE INDEX IF NOT EXISTS idx_creators_orientation ON creators(orientation);
CREATE INDEX IF NOT EXISTS idx_creators_content_type ON creators USING GIN(content_type);