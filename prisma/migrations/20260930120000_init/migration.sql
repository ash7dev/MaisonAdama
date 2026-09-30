-- =============================================================================
--  Maison Adama — Migration 1/5 : structure
--
--  Prélude (avant les tables) : extensions, fonctions utilisées par les DEFAULT
--  et par les index d'expression, séquence des numéros de commande.
--  Le reste du fichier est généré par Prisma (prisma migrate diff --from-empty).
-- =============================================================================

-- Supabase installe les extensions dans le schéma "extensions" ; ailleurs elles
-- peuvent vivre dans "public". Le search_path couvre les deux cas.
-- @protected-begin
CREATE SCHEMA IF NOT EXISTS extensions;
SET search_path TO public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;  -- recherche floue
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;  -- "epice" = "Épicé"

-- UUID v7 (RFC 9562) : 48 bits d'horodatage ms + aléa. Ordonné dans le temps,
-- donc index B-tree compacts. gen_random_uuid() est natif depuis PostgreSQL 13.
CREATE OR REPLACE FUNCTION public.uuid_generate_v7() RETURNS uuid
LANGUAGE sql VOLATILE PARALLEL SAFE AS $$
  SELECT encode(
    set_bit(set_bit(
      overlay(uuid_send(gen_random_uuid())
              PLACING substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
              FROM 1 FOR 6),
      52, 1), 53, 1),
    'hex')::uuid;
$$;

-- Normalisation de recherche : minuscules, sans accents. IMMUTABLE pour être
-- indexable ; le SET search_path la rend indépendante de la session appelante.
CREATE OR REPLACE FUNCTION public.normalize_search(p_text text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, extensions AS $$
  SELECT lower(unaccent('unaccent'::regdictionary, p_text));
$$;

-- Texte de recherche d'un produit : nom + synonymes ("thiouraye", "bakhour"…).
CREATE OR REPLACE FUNCTION public.product_search_text(p_name text, p_keywords text[]) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = public, extensions AS $$
  SELECT lower(unaccent('unaccent'::regdictionary,
         coalesce(p_name, '') || ' ' || coalesce(array_to_string(p_keywords, ' '), '')));
$$;

-- Numérotation lisible des commandes : CMD-2026-00001 (compteur global, non remis
-- à zéro chaque année ; des trous sont possibles si une commande échoue).
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1;
-- @protected-end

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('HOMME', 'FEMME', 'UNISEXE');

-- CreateEnum
CREATE TYPE "concentration" AS ENUM ('EAU_DE_TOILETTE', 'EAU_DE_PARFUM', 'EXTRAIT');

-- CreateEnum
CREATE TYPE "variant_unit" AS ENUM ('ML', 'G', 'UNITE');

-- CreateEnum
CREATE TYPE "promotion_type" AS ENUM ('POURCENTAGE', 'MONTANT_FIXE');

-- CreateEnum
CREATE TYPE "stock_movement_type" AS ENUM ('REASSORT', 'VENTE', 'ANNULATION', 'AJUSTEMENT');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('NON_PAYE', 'PAYE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('WAVE', 'A_LA_LIVRAISON');

-- CreateEnum
CREATE TYPE "admin_role" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "has_concentration" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "short_description" VARCHAR(300),
    "description" TEXT,
    "category_id" UUID NOT NULL,
    "brand_id" UUID,
    "gender" "gender",
    "concentration" "concentration",
    "search_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" VARCHAR(70),
    "seo_description" VARCHAR(160),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "product_id" UUID NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "alt" VARCHAR(200),
    "width" INTEGER,
    "height" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "product_id" UUID NOT NULL,
    "size" DECIMAL(8,2) NOT NULL,
    "unit" "variant_unit" NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 3,
    "sku" VARCHAR(64),
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olfactory_families" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "olfactory_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_olfactory_families" (
    "product_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,

    CONSTRAINT "product_olfactory_families_pkey" PRIMARY KEY ("product_id","family_id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_collections" (
    "collection_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_collections_pkey" PRIMARY KEY ("collection_id","product_id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(120) NOT NULL,
    "type" "promotion_type" NOT NULL,
    "value" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "code" VARCHAR(40),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_targets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "promotion_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,

    CONSTRAINT "promotion_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "variant_id" UUID NOT NULL,
    "type" "stock_movement_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "order_id" UUID,
    "admin_id" UUID,
    "note" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "admin_note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(80) NOT NULL,
    "region" VARCHAR(80) NOT NULL,
    "default_fee" INTEGER NOT NULL,
    "estimated_delay" VARCHAR(40),
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "order_number" VARCHAR(20) NOT NULL DEFAULT ('CMD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 5, '0')),
    "idempotency_key" UUID NOT NULL,
    "public_token" VARCHAR(32) NOT NULL DEFAULT replace((gen_random_uuid())::text, '-', ''),
    "customer_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'EN_ATTENTE',
    "payment_status" "payment_status" NOT NULL DEFAULT 'NON_PAYE',
    "payment_method" "payment_method" NOT NULL,
    "payment_reference" VARCHAR(80),
    "paid_at" TIMESTAMPTZ(3),
    "payment_confirmed_by" UUID,
    "refunded_at" TIMESTAMPTZ(3),
    "customer_name" VARCHAR(120) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "delivery_zone_id" UUID NOT NULL,
    "zone_name" VARCHAR(80) NOT NULL,
    "default_delivery_fee" INTEGER NOT NULL,
    "delivery_fee" INTEGER NOT NULL,
    "delivery_fee_note" VARCHAR(300),
    "region" VARCHAR(80) NOT NULL,
    "city" VARCHAR(80) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "landmark" VARCHAR(255),
    "customer_note" TEXT,
    "subtotal" INTEGER NOT NULL,
    "discount_total" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "confirmed_at" TIMESTAMPTZ(3),
    "shipped_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_reason" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "promotion_id" UUID,
    "promotion_name" VARCHAR(120),
    "product_name" VARCHAR(160) NOT NULL,
    "variant_label" VARCHAR(40) NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "unit_discount" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "order_id" UUID NOT NULL,
    "from_status" "order_status",
    "to_status" "order_status" NOT NULL,
    "admin_id" UUID,
    "note" VARCHAR(300),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "store_name" VARCHAR(120) NOT NULL,
    "wave_merchant_code" VARCHAR(40),
    "wave_qr_image_path" VARCHAR(500),
    "whatsapp_number" VARCHAR(20),
    "contact_phone" VARCHAR(20),
    "contact_email" VARCHAR(120),
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "role" "admin_role" NOT NULL DEFAULT 'OWNER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "table_name" VARCHAR(63) NOT NULL,
    "record_id" VARCHAR(64) NOT NULL,
    "action" "audit_action" NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "admin_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_is_active_position_idx" ON "categories"("is_active", "position");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_is_active_name_idx" ON "brands"("is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_id_is_published_is_archived_idx" ON "products"("category_id", "is_published", "is_archived");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "products_gender_idx" ON "products"("gender");

-- CreateIndex
CREATE INDEX "products_published_at_idx" ON "products"("published_at" DESC);

-- CreateIndex
CREATE INDEX "product_images_product_id_position_idx" ON "product_images"("product_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_position_idx" ON "product_variants"("product_id", "position");

-- CreateIndex
CREATE INDEX "product_variants_price_idx" ON "product_variants"("price");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_id_product_id_key" ON "product_variants"("id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_size_unit_key" ON "product_variants"("product_id", "size", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "olfactory_families_name_key" ON "olfactory_families"("name");

-- CreateIndex
CREATE UNIQUE INDEX "olfactory_families_slug_key" ON "olfactory_families"("slug");

-- CreateIndex
CREATE INDEX "product_olfactory_families_family_id_product_id_idx" ON "product_olfactory_families"("family_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_is_active_position_idx" ON "collections"("is_active", "position");

-- CreateIndex
CREATE INDEX "product_collections_collection_id_position_idx" ON "product_collections"("collection_id", "position");

-- CreateIndex
CREATE INDEX "product_collections_product_id_idx" ON "product_collections"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");

-- CreateIndex
CREATE INDEX "promotions_is_active_starts_at_ends_at_idx" ON "promotions"("is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "promotion_targets_product_id_idx" ON "promotion_targets"("product_id");

-- CreateIndex
CREATE INDEX "promotion_targets_variant_id_idx" ON "promotion_targets"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_targets_promotion_id_product_id_key" ON "promotion_targets"("promotion_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_targets_promotion_id_variant_id_key" ON "promotion_targets"("promotion_id", "variant_id");

-- CreateIndex
CREATE INDEX "stock_movements_variant_id_created_at_idx" ON "stock_movements"("variant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "stock_movements_order_id_idx" ON "stock_movements"("order_id");

-- CreateIndex
CREATE INDEX "stock_movements_admin_id_idx" ON "stock_movements"("admin_id");

-- CreateIndex
CREATE INDEX "stock_movements_type_created_at_idx" ON "stock_movements"("type", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_name_key" ON "delivery_zones"("name");

-- CreateIndex
CREATE INDEX "delivery_zones_is_active_position_idx" ON "delivery_zones"("is_active", "position");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "orders_public_token_key" ON "orders"("public_token");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_payment_status_payment_method_idx" ON "orders"("payment_status", "payment_method");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_delivery_zone_id_idx" ON "orders"("delivery_zone_id");

-- CreateIndex
CREATE INDEX "orders_payment_confirmed_by_idx" ON "orders"("payment_confirmed_by");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "order_items_variant_id_product_id_idx" ON "order_items"("variant_id", "product_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_promotion_id_idx" ON "order_items"("promotion_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_variant_id_key" ON "order_items"("order_id", "variant_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "order_status_history_admin_id_idx" ON "order_status_history"("admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_created_at_idx" ON "audit_logs"("table_name", "record_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_admin_id_created_at_idx" ON "audit_logs"("admin_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_olfactory_families" ADD CONSTRAINT "product_olfactory_families_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_olfactory_families" ADD CONSTRAINT "product_olfactory_families_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "olfactory_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_confirmed_by_fkey" FOREIGN KEY ("payment_confirmed_by") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_id_fkey" FOREIGN KEY ("variant_id", "product_id") REFERENCES "product_variants"("id", "product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- La séquence appartient à la colonne : supprimer la table supprime la séquence.
ALTER SEQUENCE order_number_seq OWNED BY orders.order_number;

RESET search_path;
