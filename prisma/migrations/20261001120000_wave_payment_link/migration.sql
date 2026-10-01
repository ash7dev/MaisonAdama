-- Lien de paiement marchand Wave Business (https://pay.wave.com/m/<id>/c/<pays>/).
-- La page de confirmation y ajoute ?amount=<total> : le client paie en un geste.
ALTER TABLE "store_settings" ADD COLUMN "wave_payment_link" VARCHAR(200);

ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_wave_payment_link_format"
  CHECK ("wave_payment_link" IS NULL OR "wave_payment_link" ~ '^https://pay\.wave\.com/m/[A-Za-z0-9_-]+/c/[a-z]{2}/$');
