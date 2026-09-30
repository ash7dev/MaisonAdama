-- @protected
-- =============================================================================
--  Maison Adama — Migration 6 : droits d'exécution des futures fonctions
--
--  Correctif de la migration 5, constaté sur Supabase : un
--  « ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE … FROM PUBLIC » ne peut
--  qu'AJOUTER des droits par schéma ; il ne retire pas le droit EXECUTE que
--  PostgreSQL accorde globalement à PUBLIC sur toute nouvelle fonction.
--  La fonction enable_rls_on_new_tables(), créée après le REVOKE explicite,
--  était donc restée exécutable par PUBLIC (sans danger : une fonction
--  event_trigger ne peut pas être appelée directement, mais la règle doit être
--  sans exception).
-- =============================================================================

-- Défaut GLOBAL (sans IN SCHEMA) pour les fonctions créées par ce rôle.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Rattrapage de l'existant.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
