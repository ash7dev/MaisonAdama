-- Familles olfactives gérées depuis l'admin (Paramètres) : une phrase simple
-- par famille (« Cèdre, santal, oud »), affichée sur la roue, les filtres et
-- les fiches produit. Les 8 familles d'origine reprennent leur phrase.
ALTER TABLE "olfactory_families" ADD COLUMN "hint" VARCHAR(80);

ALTER TABLE "olfactory_families" ADD CONSTRAINT "olfactory_families_hint_not_blank"
  CHECK ("hint" IS NULL OR btrim("hint") <> '');

UPDATE "olfactory_families" SET "hint" = CASE "slug"
  WHEN 'boise'    THEN 'Cèdre, santal, oud'
  WHEN 'floral'   THEN 'Rose, jasmin, fleur d’oranger'
  WHEN 'oriental' THEN 'Épices douces, résines, vanille'
  WHEN 'fruite'   THEN 'Fruits rouges, pêche, agrumes'
  WHEN 'epice'    THEN 'Cannelle, girofle, poivre'
  WHEN 'musque'   THEN 'Musc blanc, peau propre, doux'
  WHEN 'ambre'    THEN 'Ambre, vanille, chaleur'
  WHEN 'frais'    THEN 'Agrumes, marin, léger'
END
WHERE "hint" IS NULL;
