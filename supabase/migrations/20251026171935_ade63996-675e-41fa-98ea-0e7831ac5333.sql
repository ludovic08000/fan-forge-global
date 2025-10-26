-- ATTENTION : Cette action supprime TOUS les utilisateurs et TOUTES leurs données
-- Cela inclut : profils, contenus, abonnements, messages, paiements, etc.

-- Supprimer tous les utilisateurs de la table auth.users
-- Les contraintes ON DELETE CASCADE supprimeront automatiquement toutes les données liées
DELETE FROM auth.users;