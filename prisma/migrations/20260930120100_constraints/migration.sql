-- @protected
-- =============================================================================
--  Maison Adama — Migration 2/5 : contraintes CHECK et index ciblés
--
--  La base refuse les données incohérentes, même en cas de bug applicatif.
--  Prisma ne modélise ni les CHECK ni les index partiels / d'expression :
--  `npm run db:guard` empêche une future migration de les supprimer par erreur.
-- =============================================================================

SET search_path TO public, extensions;

-- -----------------------------------------------------------------------------
--  1. CATALOGUE
-- -----------------------------------------------------------------------------

ALTER TABLE categories
  ADD CONSTRAINT categories_not_self_parent CHECK (parent_id IS NULL OR parent_id <> id),
  ADD CONSTRAINT categories_name_not_blank  CHECK (btrim(name) <> ''),
  ADD CONSTRAINT categories_slug_format     CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE brands
  ADD CONSTRAINT brands_name_not_blank CHECK (btrim(name) <> ''),
  ADD CONSTRAINT brands_slug_format    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE collections
  ADD CONSTRAINT collections_name_not_blank CHECK (btrim(name) <> ''),
  ADD CONSTRAINT collections_slug_format    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE olfactory_families
  ADD CONSTRAINT olfactory_families_name_not_blank CHECK (btrim(name) <> ''),
  ADD CONSTRAINT olfactory_families_slug_format    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE products
  ADD CONSTRAINT products_name_not_blank             CHECK (btrim(name) <> ''),
  ADD CONSTRAINT products_slug_format                CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD CONSTRAINT products_not_published_and_archived CHECK (NOT (is_published AND is_archived)),
  ADD CONSTRAINT products_published_has_date         CHECK (NOT is_published OR published_at IS NOT NULL);

ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_stock_non_negative     CHECK (stock >= 0),
  ADD CONSTRAINT product_variants_price_positive         CHECK (price > 0),
  ADD CONSTRAINT product_variants_size_positive          CHECK (size > 0),
  ADD CONSTRAINT product_variants_threshold_non_negative CHECK (low_stock_threshold >= 0),
  ADD CONSTRAINT product_variants_label_not_blank        CHECK (btrim(label) <> '');

ALTER TABLE product_images
  ADD CONSTRAINT product_images_path_not_blank      CHECK (btrim(storage_path) <> ''),
  ADD CONSTRAINT product_images_dimensions_positive CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0));

-- -----------------------------------------------------------------------------
--  2. PROMOTIONS
-- -----------------------------------------------------------------------------

ALTER TABLE promotions
  ADD CONSTRAINT promotions_name_not_blank CHECK (btrim(name) <> ''),
  ADD CONSTRAINT promotions_value_positive CHECK (value > 0),
  ADD CONSTRAINT promotions_percentage_max CHECK (type <> 'POURCENTAGE' OR value <= 100),
  ADD CONSTRAINT promotions_valid_period   CHECK (ends_at > starts_at),
  ADD CONSTRAINT promotions_code_format    CHECK (code IS NULL OR code ~ '^[A-Z0-9_-]{3,40}$');

ALTER TABLE promotion_targets
  ADD CONSTRAINT promotion_targets_exactly_one_target CHECK (num_nonnulls(product_id, variant_id) = 1);

-- -----------------------------------------------------------------------------
--  3. STOCK
-- -----------------------------------------------------------------------------

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_quantity_not_zero    CHECK (quantity <> 0),
  ADD CONSTRAINT stock_movements_stock_after_positive CHECK (stock_after >= 0),
  ADD CONSTRAINT stock_movements_sign_matches_type CHECK (
    (type = 'REASSORT'   AND quantity > 0) OR
    (type = 'VENTE'      AND quantity < 0) OR
    (type = 'ANNULATION' AND quantity > 0) OR
    (type = 'AJUSTEMENT')
  ),
  -- VENTE / ANNULATION ⇔ liées à une commande ; REASSORT / AJUSTEMENT ⇔ jamais.
  ADD CONSTRAINT stock_movements_order_iff_sale CHECK (
    (type IN ('VENTE', 'ANNULATION')) = (order_id IS NOT NULL)
  ),
  -- Une correction manuelle est toujours signée et justifiée.
  ADD CONSTRAINT stock_movements_adjustment_justified CHECK (
    type <> 'AJUSTEMENT' OR (admin_id IS NOT NULL AND note IS NOT NULL AND btrim(note) <> '')
  );

-- Une seule sortie et une seule remise en stock par ligne de commande :
-- impossible de libérer deux fois le stock d'une commande annulée.
CREATE UNIQUE INDEX stock_movements_one_sale_per_line
  ON stock_movements (order_id, variant_id) WHERE type = 'VENTE';
CREATE UNIQUE INDEX stock_movements_one_release_per_line
  ON stock_movements (order_id, variant_id) WHERE type = 'ANNULATION';

-- -----------------------------------------------------------------------------
--  4. CLIENTS & LIVRAISON
-- -----------------------------------------------------------------------------

ALTER TABLE customers
  ADD CONSTRAINT customers_name_not_blank CHECK (btrim(name) <> ''),
  ADD CONSTRAINT customers_phone_format   CHECK (phone ~ '^\+221[0-9]{9}$');

ALTER TABLE delivery_zones
  ADD CONSTRAINT delivery_zones_name_not_blank   CHECK (btrim(name) <> ''),
  ADD CONSTRAINT delivery_zones_fee_non_negative CHECK (default_fee >= 0);

-- -----------------------------------------------------------------------------
--  5. COMMANDES
--     subtotal = Σ prix brut, discount_total = Σ remises (vérifiés au COMMIT par
--     trigger, voir migration 3), total = subtotal − remises + livraison.
-- -----------------------------------------------------------------------------

ALTER TABLE orders
  -- Montants
  ADD CONSTRAINT orders_subtotal_positive     CHECK (subtotal > 0),
  ADD CONSTRAINT orders_amounts_non_negative  CHECK (discount_total >= 0 AND delivery_fee >= 0 AND default_delivery_fee >= 0),
  ADD CONSTRAINT orders_discount_le_subtotal  CHECK (discount_total <= subtotal),
  ADD CONSTRAINT orders_total_consistent      CHECK (total = subtotal - discount_total + delivery_fee),
  ADD CONSTRAINT orders_fee_change_justified  CHECK (
    delivery_fee = default_delivery_fee OR (delivery_fee_note IS NOT NULL AND btrim(delivery_fee_note) <> '')
  ),
  -- Snapshot client / adresse
  ADD CONSTRAINT orders_customer_phone_format CHECK (customer_phone ~ '^\+221[0-9]{9}$'),
  ADD CONSTRAINT orders_snapshot_not_blank    CHECK (
    btrim(customer_name) <> '' AND btrim(zone_name) <> '' AND btrim(region) <> ''
    AND btrim(city) <> '' AND btrim(address) <> ''
  ),
  -- Paiement
  ADD CONSTRAINT orders_unpaid_is_clean CHECK (
    payment_status <> 'NON_PAYE' OR (paid_at IS NULL AND payment_confirmed_by IS NULL AND refunded_at IS NULL)
  ),
  ADD CONSTRAINT orders_paid_is_traced CHECK (
    payment_status = 'NON_PAYE' OR (paid_at IS NOT NULL AND payment_confirmed_by IS NOT NULL)
  ),
  ADD CONSTRAINT orders_refund_has_date CHECK ((payment_status = 'REMBOURSE') = (refunded_at IS NOT NULL)),
  ADD CONSTRAINT orders_cancelled_not_paid CHECK (NOT (status = 'ANNULEE' AND payment_status = 'PAYE')),
  -- Statuts ⇔ jalons
  ADD CONSTRAINT orders_confirmed_has_date CHECK (
    status NOT IN ('CONFIRMEE', 'EN_LIVRAISON', 'LIVREE') OR confirmed_at IS NOT NULL
  ),
  ADD CONSTRAINT orders_shipped_has_date   CHECK (status NOT IN ('EN_LIVRAISON', 'LIVREE') OR shipped_at IS NOT NULL),
  ADD CONSTRAINT orders_delivered_has_date CHECK ((status = 'LIVREE')  = (delivered_at IS NOT NULL)),
  ADD CONSTRAINT orders_cancelled_has_date CHECK ((status = 'ANNULEE') = (cancelled_at IS NOT NULL)),
  ADD CONSTRAINT orders_cancel_has_reason  CHECK (
    status <> 'ANNULEE' OR (cancel_reason IS NOT NULL AND btrim(cancel_reason) <> '')
  ),
  ADD CONSTRAINT orders_chronology CHECK (
        (confirmed_at IS NULL OR confirmed_at >= created_at)
    AND (shipped_at   IS NULL OR (confirmed_at IS NOT NULL AND shipped_at   >= confirmed_at))
    AND (delivered_at IS NULL OR (shipped_at   IS NOT NULL AND delivered_at >= shipped_at))
    AND (cancelled_at IS NULL OR cancelled_at >= created_at)
    AND (paid_at      IS NULL OR paid_at      >= created_at)
    AND (refunded_at  IS NULL OR (paid_at      IS NOT NULL AND refunded_at  >= paid_at))
  );

ALTER TABLE order_items
  ADD CONSTRAINT order_items_quantity_positive     CHECK (quantity > 0),
  ADD CONSTRAINT order_items_price_positive        CHECK (unit_price > 0),
  ADD CONSTRAINT order_items_discount_valid        CHECK (unit_discount >= 0 AND unit_discount <= unit_price),
  ADD CONSTRAINT order_items_line_total_consistent CHECK (line_total = (unit_price - unit_discount) * quantity),
  ADD CONSTRAINT order_items_snapshot_not_blank    CHECK (btrim(product_name) <> '' AND btrim(variant_label) <> ''),
  -- Une remise ⇔ une promotion identifiée, avec son nom figé.
  ADD CONSTRAINT order_items_discount_has_promotion CHECK ((unit_discount > 0) = (promotion_id IS NOT NULL)),
  ADD CONSTRAINT order_items_promotion_has_name     CHECK ((promotion_id IS NULL) = (promotion_name IS NULL));

-- -----------------------------------------------------------------------------
--  6. ADMINISTRATION
-- -----------------------------------------------------------------------------

ALTER TABLE store_settings
  ADD CONSTRAINT store_settings_singleton        CHECK (id = 1),
  ADD CONSTRAINT store_settings_name_not_blank   CHECK (btrim(store_name) <> ''),
  ADD CONSTRAINT store_settings_whatsapp_format  CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT store_settings_phone_format     CHECK (contact_phone   IS NULL OR contact_phone   ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT store_settings_email_format     CHECK (contact_email   IS NULL OR contact_email   ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

ALTER TABLE admin_profiles
  ADD CONSTRAINT admin_profiles_name_not_blank CHECK (btrim(full_name) <> '');

-- -----------------------------------------------------------------------------
--  7. INDEX PARTIELS ET D'EXPRESSION
--     Petits, ciblés, et exactement alignés sur les requêtes réelles.
-- -----------------------------------------------------------------------------

-- Storefront : catalogue visible, trié par nouveauté
CREATE INDEX products_storefront_idx
  ON products (category_id, published_at DESC)
  WHERE is_published AND NOT is_archived;

-- Storefront : recherche floue sans accents sur nom + synonymes.
-- Requête : WHERE product_search_text(name, search_keywords) LIKE '%' || normalize_search($1) || '%'
CREATE INDEX products_search_trgm_idx
  ON products USING gin (product_search_text(name, search_keywords) gin_trgm_ops);

-- Storefront : variantes achetables (tri / filtre par prix)
CREATE INDEX product_variants_buyable_idx
  ON product_variants (product_id, price)
  WHERE is_active AND stock > 0;

-- Admin : alertes de stock bas
CREATE INDEX product_variants_low_stock_idx
  ON product_variants (product_id, stock)
  WHERE is_active AND stock <= low_stock_threshold;

-- Admin : recherche client par nom, sans accents
CREATE INDEX customers_search_trgm_idx
  ON customers USING gin (normalize_search(name) gin_trgm_ops);

-- Admin : file de commandes à traiter
CREATE INDEX orders_open_idx
  ON orders (status, created_at DESC)
  WHERE status IN ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON');

-- Admin : paiements Wave à vérifier
CREATE INDEX orders_wave_to_verify_idx
  ON orders (created_at)
  WHERE payment_method = 'WAVE' AND payment_status = 'NON_PAYE' AND status <> 'ANNULEE';

-- Statistiques : chiffre d'affaires (commandes payées uniquement)
CREATE INDEX orders_revenue_idx
  ON orders (paid_at DESC)
  INCLUDE (total)
  WHERE payment_status = 'PAYE';

-- Storefront : promotions automatiques en cours
CREATE INDEX promotions_live_idx
  ON promotions (starts_at, ends_at)
  WHERE is_active AND code IS NULL;

RESET search_path;
