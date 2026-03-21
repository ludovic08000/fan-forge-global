-- Restaurer les permissions de base sur la table creators
-- Les politiques RLS existantes contrôlent déjà l'accès granulaire
GRANT SELECT ON public.creators TO authenticated;
GRANT SELECT ON public.creators TO anon;
GRANT INSERT ON public.creators TO authenticated;
GRANT UPDATE ON public.creators TO authenticated;