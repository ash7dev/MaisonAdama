-- @protected
-- =============================================================================
--  Maison Adama — Migration 4/5 : journal d'audit
--
--  « Qui a changé quoi, quand, et quelle était la valeur avant ? »
--  - INSERT / DELETE : la ligne complète.
--  - UPDATE : uniquement les colonnes modifiées (old_data / new_data).
--  - Colonnes ignorées : updated_at, et celles passées en argument du trigger
--    (ex. stock, déjà tracé par stock_movements).
--  - L'admin est lu dans app.admin_id (voir src/lib/db-context.ts).
-- =============================================================================

SET search_path TO public, extensions;

CREATE FUNCTION audit_row() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_ignored text[] := array_append(coalesce(TG_ARGV::text[], '{}'), 'updated_at');
  v_old     jsonb;
  v_new     jsonb;
  v_old_diff jsonb;
  v_new_diff jsonb;
  v_record_id text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD) - v_ignored; END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW) - v_ignored; END IF;
  v_record_id := coalesce(v_new ->> 'id', v_old ->> 'id');

  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(e.key, e.value) INTO v_old_diff
      FROM jsonb_each(v_old) e WHERE v_new -> e.key IS DISTINCT FROM e.value;
    SELECT jsonb_object_agg(e.key, e.value) INTO v_new_diff
      FROM jsonb_each(v_new) e WHERE v_old -> e.key IS DISTINCT FROM e.value;
    IF v_new_diff IS NULL THEN
      RETURN NULL; -- rien d'intéressant n'a changé (ex. seul le stock a bougé)
    END IF;
    v_old := v_old_diff;
    v_new := v_new_diff;
  END IF;

  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, admin_id)
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP::audit_action,
    v_old,
    v_new,
    app_admin_id()
  );
  RETURN NULL;
END $$;

-- Catalogue, prix, promotions, livraison, paramètres, comptes admin : tout.
CREATE TRIGGER categories_audit        AFTER INSERT OR UPDATE OR DELETE ON categories        FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER brands_audit            AFTER INSERT OR UPDATE OR DELETE ON brands            FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER products_audit          AFTER INSERT OR UPDATE OR DELETE ON products          FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER product_variants_audit  AFTER INSERT OR UPDATE OR DELETE ON product_variants  FOR EACH ROW EXECUTE FUNCTION audit_row('stock');
CREATE TRIGGER collections_audit       AFTER INSERT OR UPDATE OR DELETE ON collections       FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER promotions_audit        AFTER INSERT OR UPDATE OR DELETE ON promotions        FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER promotion_targets_audit AFTER INSERT OR UPDATE OR DELETE ON promotion_targets FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER delivery_zones_audit    AFTER INSERT OR UPDATE OR DELETE ON delivery_zones    FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER store_settings_audit    AFTER INSERT OR UPDATE OR DELETE ON store_settings    FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER admin_profiles_audit    AFTER INSERT OR UPDATE OR DELETE ON admin_profiles    FOR EACH ROW EXECUTE FUNCTION audit_row();

-- Commandes et clients : la création vient du checkout (déjà tracée par la
-- commande elle-même) ; on audite les modifications faites ensuite.
CREATE TRIGGER orders_audit    AFTER UPDATE ON orders    FOR EACH ROW EXECUTE FUNCTION audit_row();
CREATE TRIGGER customers_audit AFTER UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION audit_row();

CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();

RESET search_path;
