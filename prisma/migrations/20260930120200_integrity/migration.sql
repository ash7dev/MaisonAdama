-- @protected
-- =============================================================================
--  Maison Adama — Migration 3/5 : invariants métier (fonctions et triggers)
--
--  Codes d'erreur (SQLSTATE et préfixe du message, mappés en DomainError par
--  src/lib/db-errors.ts) :
--    MA001 stock insuffisant           MA030 transition de statut interdite
--    MA002 variante introuvable        MA031 transition de paiement interdite
--    MA010 écriture de stock directe   MA040 commande incohérente (montants, stock)
--    MA020 donnée immuable             MA041 produit indisponible
--    MA042 prix périmé                 MA043 snapshot invalide
--    MA044 remise invalide             MA045 commande non modifiable
--    MA050 produit publié sans variante active
--    MA051 concentration hors catégorie autorisée
--    MA060 administrateur inconnu ou désactivé
--
--  Contexte de session (toujours en portée transaction, compatible PgBouncer) :
--    app.admin_id     — admin qui agit (set_config(..., true), voir db-context.ts)
--    app.stock_move   — interne à move_stock()
-- =============================================================================

SET search_path TO public, extensions;

-- -----------------------------------------------------------------------------
--  0. OUTILS
-- -----------------------------------------------------------------------------

-- Admin courant, lu dans le contexte de transaction. Refuse un admin désactivé.
CREATE FUNCTION app_admin_id() RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_admin uuid := nullif(current_setting('app.admin_id', true), '')::uuid;
BEGIN
  IF v_admin IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM admin_profiles WHERE id = v_admin AND is_active) THEN
    RAISE EXCEPTION '[MA060] Administrateur inconnu ou désactivé : %', v_admin
      USING ERRCODE = 'MA060';
  END IF;
  RETURN v_admin;
END $$;

CREATE FUNCTION forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '[MA020] % est immuable : % interdit', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'MA020';
END $$;

-- @updatedAt n'est rempli que par Prisma : ce trigger couvre aussi le SQL direct.
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER categories_set_updated_at       BEFORE UPDATE ON categories       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER brands_set_updated_at           BEFORE UPDATE ON brands           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_set_updated_at         BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER collections_set_updated_at      BEFORE UPDATE ON collections      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER promotions_set_updated_at       BEFORE UPDATE ON promotions       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_set_updated_at        BEFORE UPDATE ON customers        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER delivery_zones_set_updated_at   BEFORE UPDATE ON delivery_zones   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at           BEFORE UPDATE ON orders           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER store_settings_set_updated_at   BEFORE UPDATE ON store_settings   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER admin_profiles_set_updated_at   BEFORE UPDATE ON admin_profiles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
--  1. STOCK — une seule porte d'entrée : move_stock()
--     Invariant : product_variants.stock = Σ stock_movements.quantity
-- -----------------------------------------------------------------------------

CREATE FUNCTION guard_stock_write() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.stock_move', true) IS DISTINCT FROM 'on' THEN
    IF TG_TABLE_NAME = 'stock_movements' THEN
      RAISE EXCEPTION '[MA010] Les mouvements de stock ne s''écrivent que via move_stock()'
        USING ERRCODE = 'MA010';
    ELSIF TG_OP = 'INSERT' AND NEW.stock <> 0 THEN
      RAISE EXCEPTION '[MA010] Une variante naît avec un stock à 0 : utilisez move_stock(..., ''REASSORT'')'
        USING ERRCODE = 'MA010';
    ELSIF TG_OP = 'UPDATE' AND NEW.stock IS DISTINCT FROM OLD.stock THEN
      RAISE EXCEPTION '[MA010] Le stock ne se modifie que via move_stock()'
        USING ERRCODE = 'MA010';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER product_variants_guard_stock
  BEFORE INSERT OR UPDATE OF stock ON product_variants
  FOR EACH ROW EXECUTE FUNCTION guard_stock_write();

CREATE TRIGGER stock_movements_guard_insert
  BEFORE INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION guard_stock_write();

-- Décrément / incrément atomique + journalisation, dans la transaction appelante.
-- Deux ventes simultanées de la dernière bouteille : la seconde attend le verrou
-- de ligne, réévalue « stock + quantité >= 0 » et échoue proprement (MA001).
CREATE FUNCTION move_stock(
  p_variant_id uuid,
  p_quantity   integer,
  p_type       stock_movement_type,
  p_order_id   uuid DEFAULT NULL,
  p_note       text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_after integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity = 0 THEN
    RAISE EXCEPTION '[MA040] Quantité de mouvement invalide : %', p_quantity USING ERRCODE = 'MA040';
  END IF;

  PERFORM set_config('app.stock_move', 'on', true);

  UPDATE product_variants
     SET stock = stock + p_quantity
   WHERE id = p_variant_id
     AND stock + p_quantity >= 0
  RETURNING stock INTO v_after;

  IF v_after IS NULL THEN
    PERFORM set_config('app.stock_move', 'off', true);
    IF EXISTS (SELECT 1 FROM product_variants WHERE id = p_variant_id) THEN
      RAISE EXCEPTION '[MA001] Stock insuffisant pour la variante %', p_variant_id USING ERRCODE = 'MA001';
    END IF;
    RAISE EXCEPTION '[MA002] Variante introuvable : %', p_variant_id USING ERRCODE = 'MA002';
  END IF;

  INSERT INTO stock_movements (variant_id, type, quantity, stock_after, order_id, admin_id, note)
  VALUES (p_variant_id, p_type, p_quantity, v_after, p_order_id, app_admin_id(), p_note);

  PERFORM set_config('app.stock_move', 'off', true);
  RETURN v_after;
END $$;

-- Contrôle de l'invariant (doit renvoyer 0 ligne) : tests + tâche planifiée.
CREATE FUNCTION stock_ledger_discrepancies()
RETURNS TABLE (variant_id uuid, stock integer, ledger_sum bigint)
LANGUAGE sql STABLE AS $$
  SELECT v.id, v.stock, coalesce(sum(m.quantity), 0)
    FROM product_variants v
    LEFT JOIN stock_movements m ON m.variant_id = v.id
   GROUP BY v.id, v.stock
  HAVING v.stock <> coalesce(sum(m.quantity), 0);
$$;

-- -----------------------------------------------------------------------------
--  2. PRIX — la base est la source de vérité du tarif appliqué
--     Règle : la promotion automatique la plus avantageuse gagne, sans cumul.
--     Arrondi identique à src/features/pricing/compute-price.ts (demi vers le haut).
-- -----------------------------------------------------------------------------

-- Remise (FCFA) qu'une promotion accorde à une variante à l'instant p_at,
-- ou NULL si elle ne s'applique pas.
CREATE FUNCTION promotion_discount(p_promotion_id uuid, p_variant_id uuid, p_at timestamptz)
RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT CASE p.type
           WHEN 'POURCENTAGE' THEN round(v.price * p.value / 100.0)::integer
           ELSE least(p.value, v.price)
         END
    FROM promotions p
    JOIN product_variants v ON v.id = p_variant_id
   WHERE p.id = p_promotion_id
     AND p.is_active
     AND p.code IS NULL
     AND p_at >= p.starts_at AND p_at < p.ends_at
     AND EXISTS (
       SELECT 1 FROM promotion_targets t
        WHERE t.promotion_id = p.id
          AND (t.variant_id = v.id OR t.product_id = v.product_id)
     );
$$;

-- Tarif d'une variante : prix catalogue + meilleure promotion en cours.
-- Utilisé par le checkout ET par le trigger de contrôle des lignes de commande.
CREATE FUNCTION variant_best_offer(p_variant_id uuid, p_at timestamptz DEFAULT now())
RETURNS TABLE (unit_price integer, unit_discount integer, promotion_id uuid, promotion_name varchar)
LANGUAGE sql STABLE AS $$
  SELECT v.price, coalesce(best.discount, 0), best.id, best.name
    FROM product_variants v
    LEFT JOIN LATERAL (
      SELECT p.id, p.name, d.discount
        FROM promotions p
       CROSS JOIN LATERAL (SELECT promotion_discount(p.id, v.id, p_at) AS discount) d
       WHERE p.id IN (SELECT t.promotion_id FROM promotion_targets t
                       WHERE t.variant_id = v.id OR t.product_id = v.product_id)
         AND d.discount > 0
       ORDER BY d.discount DESC, p.id
       LIMIT 1
    ) best ON true
   WHERE v.id = p_variant_id;
$$;

-- -----------------------------------------------------------------------------
--  3. LIGNES DE COMMANDE — snapshot exact, immuable
-- -----------------------------------------------------------------------------

CREATE FUNCTION order_items_check_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  r_variant record;
  r_offer   record;
  v_status  order_status;
BEGIN
  SELECT status INTO v_status FROM orders WHERE id = NEW.order_id;
  IF v_status IS DISTINCT FROM 'EN_ATTENTE' THEN
    RAISE EXCEPTION '[MA045] Lignes ajoutées à une commande déjà traitée (%)', NEW.order_id
      USING ERRCODE = 'MA045';
  END IF;

  SELECT pv.price, pv.label, pv.is_active, pr.name, pr.is_published, pr.is_archived
    INTO r_variant
    FROM product_variants pv
    JOIN products pr ON pr.id = pv.product_id
   WHERE pv.id = NEW.variant_id AND pv.product_id = NEW.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '[MA043] La variante % n''appartient pas au produit %', NEW.variant_id, NEW.product_id
      USING ERRCODE = 'MA043';
  END IF;

  IF NOT r_variant.is_active OR NOT r_variant.is_published OR r_variant.is_archived THEN
    RAISE EXCEPTION '[MA041] Produit indisponible : % (%)', r_variant.name, r_variant.label
      USING ERRCODE = 'MA041';
  END IF;

  IF NEW.unit_price <> r_variant.price THEN
    RAISE EXCEPTION '[MA042] Prix périmé pour % (%) : catalogue %, reçu %',
      r_variant.name, r_variant.label, r_variant.price, NEW.unit_price
      USING ERRCODE = 'MA042';
  END IF;

  IF NEW.product_name <> r_variant.name OR NEW.variant_label <> r_variant.label THEN
    RAISE EXCEPTION '[MA043] Snapshot produit/variante incohérent pour %', NEW.variant_id
      USING ERRCODE = 'MA043';
  END IF;

  SELECT * INTO r_offer FROM variant_best_offer(NEW.variant_id, now());
  IF NEW.unit_discount <> r_offer.unit_discount THEN
    RAISE EXCEPTION '[MA044] Remise invalide pour % : attendue %, reçue %',
      NEW.variant_id, r_offer.unit_discount, NEW.unit_discount
      USING ERRCODE = 'MA044';
  END IF;

  -- En cas d'égalité entre promotions, n'importe laquelle des gagnantes est acceptée.
  IF NEW.promotion_id IS NOT NULL THEN
    IF promotion_discount(NEW.promotion_id, NEW.variant_id, now()) IS DISTINCT FROM NEW.unit_discount THEN
      RAISE EXCEPTION '[MA044] La promotion % ne produit pas cette remise', NEW.promotion_id
        USING ERRCODE = 'MA044';
    END IF;
    IF NEW.promotion_name IS DISTINCT FROM (SELECT name FROM promotions WHERE id = NEW.promotion_id) THEN
      RAISE EXCEPTION '[MA043] Nom de promotion incohérent pour %', NEW.promotion_id
        USING ERRCODE = 'MA043';
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER order_items_check_snapshot
  BEFORE INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION order_items_check_snapshot();

CREATE TRIGGER order_items_immutable
  BEFORE UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- -----------------------------------------------------------------------------
--  4. COMMANDES — machine d'états, champs figés, historique automatique
-- -----------------------------------------------------------------------------

CREATE FUNCTION orders_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'EN_ATTENTE' OR NEW.payment_status <> 'NON_PAYE' THEN
      RAISE EXCEPTION '[MA030] Une commande est créée EN_ATTENTE et NON_PAYE' USING ERRCODE = 'MA030';
    END IF;
    IF NEW.delivery_fee <> NEW.default_delivery_fee THEN
      RAISE EXCEPTION '[MA040] À la création, les frais de livraison sont ceux de la zone' USING ERRCODE = 'MA040';
    END IF;
    RETURN NEW;
  END IF;

  -- Champs figés : identité, client, zone et montants des articles.
  IF NEW.id                   IS DISTINCT FROM OLD.id
  OR NEW.order_number         IS DISTINCT FROM OLD.order_number
  OR NEW.idempotency_key      IS DISTINCT FROM OLD.idempotency_key
  OR NEW.public_token         IS DISTINCT FROM OLD.public_token
  OR NEW.customer_id          IS DISTINCT FROM OLD.customer_id
  OR NEW.customer_phone       IS DISTINCT FROM OLD.customer_phone
  OR NEW.delivery_zone_id     IS DISTINCT FROM OLD.delivery_zone_id
  OR NEW.zone_name            IS DISTINCT FROM OLD.zone_name
  OR NEW.default_delivery_fee IS DISTINCT FROM OLD.default_delivery_fee
  OR NEW.subtotal             IS DISTINCT FROM OLD.subtotal
  OR NEW.discount_total       IS DISTINCT FROM OLD.discount_total
  OR NEW.created_at           IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION '[MA020] Champ figé modifié sur la commande %', OLD.order_number USING ERRCODE = 'MA020';
  END IF;

  IF NEW.payment_method <> OLD.payment_method AND OLD.payment_status <> 'NON_PAYE' THEN
    RAISE EXCEPTION '[MA020] Mode de paiement figé une fois la commande payée (%)', OLD.order_number
      USING ERRCODE = 'MA020';
  END IF;

  -- Statut de commande :
  --   EN_ATTENTE → CONFIRMEE → EN_LIVRAISON → LIVREE
  --        └────────────┴──→ ANNULEE
  IF NEW.status <> OLD.status THEN
    IF NOT (
         (OLD.status = 'EN_ATTENTE'   AND NEW.status IN ('CONFIRMEE', 'ANNULEE'))
      OR (OLD.status = 'CONFIRMEE'    AND NEW.status IN ('EN_LIVRAISON', 'ANNULEE'))
      OR (OLD.status = 'EN_LIVRAISON' AND NEW.status = 'LIVREE')
    ) THEN
      RAISE EXCEPTION '[MA030] Transition de statut interdite : % → % (%)', OLD.status, NEW.status, OLD.order_number
        USING ERRCODE = 'MA030';
    END IF;

    CASE NEW.status
      WHEN 'CONFIRMEE'    THEN NEW.confirmed_at := coalesce(NEW.confirmed_at, now());
      WHEN 'EN_LIVRAISON' THEN NEW.shipped_at   := coalesce(NEW.shipped_at,   now());
      WHEN 'LIVREE'       THEN NEW.delivered_at := coalesce(NEW.delivered_at, now());
      WHEN 'ANNULEE'      THEN NEW.cancelled_at := coalesce(NEW.cancelled_at, now());
      ELSE NULL;
    END CASE;
  END IF;

  -- Statut de paiement :
  --   NON_PAYE → PAYE → REMBOURSE   (+ correction PAYE → NON_PAYE, tracée par l'audit)
  IF NEW.payment_status <> OLD.payment_status THEN
    IF NOT (
         (OLD.payment_status = 'NON_PAYE' AND NEW.payment_status = 'PAYE')
      OR (OLD.payment_status = 'PAYE'     AND NEW.payment_status IN ('REMBOURSE', 'NON_PAYE'))
    ) THEN
      RAISE EXCEPTION '[MA031] Transition de paiement interdite : % → % (%)',
        OLD.payment_status, NEW.payment_status, OLD.order_number
        USING ERRCODE = 'MA031';
    END IF;

    IF NEW.payment_status = 'PAYE' THEN
      NEW.paid_at              := coalesce(NEW.paid_at, now());
      NEW.payment_confirmed_by := coalesce(NEW.payment_confirmed_by, app_admin_id());
    ELSIF NEW.payment_status = 'REMBOURSE' THEN
      NEW.refunded_at := coalesce(NEW.refunded_at, now());
    ELSE
      NEW.paid_at              := NULL;
      NEW.payment_confirmed_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER orders_guard
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_guard();

CREATE TRIGGER orders_no_delete
  BEFORE DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Historique complet et fiable : écrit par la base, pas par l'application.
CREATE FUNCTION orders_log_status() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_from order_status;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NULL;
    END IF;
    v_from := OLD.status;
  END IF;

  INSERT INTO order_status_history (order_id, from_status, to_status, admin_id, note)
  VALUES (
    NEW.id,
    v_from,
    NEW.status,
    app_admin_id(),
    CASE WHEN NEW.status = 'ANNULEE' THEN NEW.cancel_reason END
  );
  RETURN NULL;
END $$;

CREATE TRIGGER orders_log_status
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_log_status();

CREATE TRIGGER order_status_history_immutable
  BEFORE UPDATE OR DELETE ON order_status_history
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER stock_movements_immutable
  BEFORE UPDATE OR DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER stock_movements_no_truncate       BEFORE TRUNCATE ON stock_movements       FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER order_status_history_no_truncate  BEFORE TRUNCATE ON order_status_history  FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER order_items_no_truncate           BEFORE TRUNCATE ON order_items           FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER orders_no_truncate                BEFORE TRUNCATE ON orders                FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();

-- -----------------------------------------------------------------------------
--  5. CONTRÔLES AU COMMIT (triggers de contrainte différés)
--     Vérifiés une fois la transaction complète : commande + lignes + stock.
-- -----------------------------------------------------------------------------

CREATE FUNCTION assert_order_integrity(p_order_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  r_order   orders%ROWTYPE;
  v_lines   integer;
  v_gross   bigint;
  v_disc    bigint;
  v_bad     integer;
BEGIN
  SELECT * INTO r_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT count(*),
         coalesce(sum(unit_price::bigint    * quantity), 0),
         coalesce(sum(unit_discount::bigint * quantity), 0)
    INTO v_lines, v_gross, v_disc
    FROM order_items WHERE order_id = p_order_id;

  IF v_lines = 0 THEN
    RAISE EXCEPTION '[MA040] Commande % sans ligne', r_order.order_number USING ERRCODE = 'MA040';
  END IF;

  IF r_order.subtotal <> v_gross OR r_order.discount_total <> v_disc THEN
    RAISE EXCEPTION '[MA040] Totaux incohérents pour % : sous-total % (lignes %), remises % (lignes %)',
      r_order.order_number, r_order.subtotal, v_gross, r_order.discount_total, v_disc
      USING ERRCODE = 'MA040';
  END IF;

  -- Chaque ligne a sa sortie de stock exacte…
  SELECT count(*) INTO v_bad
    FROM order_items i
    LEFT JOIN stock_movements m
      ON m.order_id = i.order_id AND m.variant_id = i.variant_id AND m.type = 'VENTE'
   WHERE i.order_id = p_order_id
     AND (m.id IS NULL OR m.quantity <> -i.quantity);
  IF v_bad > 0 THEN
    RAISE EXCEPTION '[MA040] Stock non réservé pour % ligne(s) de %', v_bad, r_order.order_number
      USING ERRCODE = 'MA040';
  END IF;

  -- …et aucun mouvement ne concerne une variante absente de la commande.
  SELECT count(*) INTO v_bad
    FROM stock_movements m
   WHERE m.order_id = p_order_id
     AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = m.order_id AND i.variant_id = m.variant_id);
  IF v_bad > 0 THEN
    RAISE EXCEPTION '[MA040] Mouvement de stock orphelin sur %', r_order.order_number USING ERRCODE = 'MA040';
  END IF;

  -- Annulée ⇔ tout le stock remis en rayon, exactement.
  IF r_order.status = 'ANNULEE' THEN
    SELECT count(*) INTO v_bad
      FROM order_items i
      LEFT JOIN stock_movements m
        ON m.order_id = i.order_id AND m.variant_id = i.variant_id AND m.type = 'ANNULATION'
     WHERE i.order_id = p_order_id
       AND (m.id IS NULL OR m.quantity <> i.quantity);
    IF v_bad > 0 THEN
      RAISE EXCEPTION '[MA040] Commande % annulée sans libération complète du stock', r_order.order_number
        USING ERRCODE = 'MA040';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM stock_movements WHERE order_id = p_order_id AND type = 'ANNULATION') THEN
    RAISE EXCEPTION '[MA040] Stock libéré alors que la commande % n''est pas annulée', r_order.order_number
      USING ERRCODE = 'MA040';
  END IF;
END $$;

CREATE FUNCTION assert_product_integrity(p_product_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  r_product record;
BEGIN
  SELECT p.name, p.is_published, p.concentration, c.has_concentration
    INTO r_product
    FROM products p JOIN categories c ON c.id = p.category_id
   WHERE p.id = p_product_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF r_product.is_published
     AND NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_product_id AND is_active) THEN
    RAISE EXCEPTION '[MA050] Produit publié sans variante active : %', r_product.name USING ERRCODE = 'MA050';
  END IF;

  IF r_product.concentration IS NOT NULL AND NOT r_product.has_concentration THEN
    RAISE EXCEPTION '[MA051] Concentration interdite dans la catégorie de %', r_product.name USING ERRCODE = 'MA051';
  END IF;
END $$;

-- Wrapper générique : TG_ARGV[0] = 'order' | 'product', TG_ARGV[1] = colonne portant l'id.
CREATE FUNCTION trg_assert_integrity() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_row jsonb;
  v_id  uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;
  v_id := (v_row ->> TG_ARGV[1])::uuid;

  IF v_id IS NOT NULL THEN
    IF TG_ARGV[0] = 'order' THEN
      PERFORM assert_order_integrity(v_id);
    ELSE
      PERFORM assert_product_integrity(v_id);
    END IF;
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER orders_integrity
  AFTER INSERT OR UPDATE ON orders
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_assert_integrity('order', 'id');

CREATE CONSTRAINT TRIGGER order_items_integrity
  AFTER INSERT ON order_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_assert_integrity('order', 'order_id');

CREATE CONSTRAINT TRIGGER stock_movements_order_integrity
  AFTER INSERT ON stock_movements
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW WHEN (NEW.order_id IS NOT NULL)
  EXECUTE FUNCTION trg_assert_integrity('order', 'order_id');

CREATE CONSTRAINT TRIGGER products_integrity
  AFTER INSERT OR UPDATE ON products
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_assert_integrity('product', 'id');

CREATE CONSTRAINT TRIGGER product_variants_integrity
  AFTER INSERT OR UPDATE OR DELETE ON product_variants
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_assert_integrity('product', 'product_id');

-- Retirer has_concentration à une catégorie qui contient des produits concentrés.
CREATE FUNCTION categories_check_concentration() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW.has_concentration
     AND EXISTS (SELECT 1 FROM products WHERE category_id = NEW.id AND concentration IS NOT NULL) THEN
    RAISE EXCEPTION '[MA051] La catégorie % contient des produits avec concentration', NEW.name
      USING ERRCODE = 'MA051';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER categories_concentration_integrity
  AFTER UPDATE OF has_concentration ON categories
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION categories_check_concentration();

RESET search_path;
