-- @protected
-- =============================================================================
--  Maison Adama — Migration 5/5 : sécurité
--
--  Supabase expose le schéma public via son API REST (tables ET fonctions, en RPC)
--  aux rôles anon / authenticated. L'application passe uniquement par Prisma
--  (rôle propriétaire, non soumis à la RLS) : l'API directe est donc fermée.
--
--  Chaque bloc est conditionnel : la migration s'applique aussi sur une base
--  PostgreSQL sans Supabase (shadow database, base de test).
-- =============================================================================

SET search_path TO public, extensions;

-- -----------------------------------------------------------------------------
--  1. LIEN AVEC SUPABASE AUTH
--     RESTRICT : un admin ayant un historique ne se supprime pas ; on le
--     désactive (admin_profiles.is_active) et on le bannit dans Supabase Auth.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    ALTER TABLE admin_profiles
      ADD CONSTRAINT admin_profiles_auth_user_fkey
      FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE RESTRICT;
  ELSE
    RAISE NOTICE 'auth.users absent (base hors Supabase) : clé étrangère admin_profiles → auth.users non créée';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
--  2. ROW LEVEL SECURITY
--     RLS activée sans politique = aucun accès via l'API.
--     Boucle sur toutes les tables du schéma : aucune n'est oubliée.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
--  3. PRIVILÈGES
--     - Aucun droit pour anon / authenticated, sur l'existant ET sur les objets
--       créés plus tard par le même rôle (ALTER DEFAULT PRIVILEGES).
--     - Fonctions : EXECUTE retiré à PUBLIC. Sans cela, move_stock() serait
--       appelable par n'importe qui via /rest/v1/rpc/move_stock.
-- -----------------------------------------------------------------------------

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM %I', v_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', v_role);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', v_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM %I', v_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', v_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', v_role);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
--  4. FILET DE SÉCURITÉ POUR LES FUTURES TABLES
--     Toute table créée ensuite dans public reçoit la RLS automatiquement.
--     (Trigger d'événement : nécessite un rôle superutilisateur, ce qui n'est pas
--     le cas du rôle postgres sur Supabase → ignoré proprement si refusé ; le test
--     "toutes les tables ont la RLS" reste le garde-fou.)
-- -----------------------------------------------------------------------------

CREATE FUNCTION enable_rls_on_new_tables() RETURNS event_trigger
LANGUAGE plpgsql AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM pg_event_trigger_ddl_commands()
     WHERE command_tag = 'CREATE TABLE' AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.object_identity);
  END LOOP;
END $$;

DO $$
BEGIN
  CREATE EVENT TRIGGER enable_rls_on_new_tables
    ON ddl_command_end WHEN TAG IN ('CREATE TABLE')
    EXECUTE FUNCTION enable_rls_on_new_tables();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Trigger d''événement non créé (droits insuffisants) : activez la RLS dans chaque migration';
END $$;

RESET search_path;
