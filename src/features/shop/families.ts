/**
 * Une phrase simple par famille olfactive : le client n'a pas besoin du
 * vocabulaire du parfumeur. Clé = slug de la famille (olfactory_families.slug).
 */
export const FAMILY_HINTS: Record<string, string> = {
  boise: 'Cèdre, santal, oud',
  floral: 'Rose, jasmin, fleur d’oranger',
  oriental: 'Épices douces, résines, vanille',
  fruite: 'Fruits rouges, pêche, agrumes',
  epice: 'Cannelle, girofle, poivre',
  musque: 'Musc blanc, peau propre, doux',
  ambre: 'Ambre, vanille, chaleur',
  frais: 'Agrumes, marin, léger',
};

/** « Boisé » → « boise » (même règle que les slugs de la base). */
export function familySlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
