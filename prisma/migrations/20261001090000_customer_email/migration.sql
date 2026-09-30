-- =============================================================================
--  Maison Adama — Migration 8 : e-mail facultatif au checkout
--
--  - orders.customer_email : figé avec la commande (comme le nom et le téléphone).
--  - customers.email       : dernière adresse connue du client.
--  Colonnes facultatives, format contrôlé en base. Aucune donnée existante touchée.
-- =============================================================================

ALTER TABLE "orders"    ADD COLUMN "customer_email" VARCHAR(160);
ALTER TABLE "customers" ADD COLUMN "email" VARCHAR(160);

ALTER TABLE "orders"
  ADD CONSTRAINT orders_customer_email_format CHECK (customer_email IS NULL OR customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
ALTER TABLE "customers"
  ADD CONSTRAINT customers_email_format CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
