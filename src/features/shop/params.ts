/**
 * Filtres de la boutique, tous dans l'URL : partageables, compatibles avec le
 * bouton Retour, lisibles par le serveur (rendu 100 % serveur).
 *
 * /boutique?univers=oud&min=5000&max=40000&contenance=12-ml&familles=boise,ambre&pour=mixte&promo=1&tri=prix-croissant&page=2
 */

export const SHOP_SORTS = ['pertinence', 'nouveautes', 'prix-croissant', 'prix-decroissant'] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export const SORT_LABELS: Record<ShopSort, string> = {
  pertinence: 'Pertinence',
  nouveautes: 'Nouveautés',
  'prix-croissant': 'Prix croissant',
  'prix-decroissant': 'Prix décroissant',
};

export const SHOP_GENDERS = ['femme', 'homme', 'mixte'] as const;
export type ShopGender = (typeof SHOP_GENDERS)[number];

export const GENDER_LABELS: Record<ShopGender, string> = { femme: 'Femme', homme: 'Homme', mixte: 'Mixte' };

/** Produits affichés par « page » (le bouton « Voir plus » en ajoute autant). */
export const SHOP_PAGE_SIZE = 24;

export type ShopParams = {
  univers?: string;
  /** Collection éditoriale (« idees-cadeaux », « nouveautes »…). */
  collection?: string;
  min?: number;
  max?: number;
  /** « 12-ml », « 100-g », « 1-unite » */
  contenance?: string;
  familles: string[];
  pour?: ShopGender;
  promo: boolean;
  tri: ShopSort;
  page: number;
};

const SLUG = /^[a-z0-9-]{1,100}$/;

export function parseShopParams(searchParams: Record<string, string | string[] | undefined>): ShopParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const int = (key: string) => {
    const n = Number(one(key));
    return Number.isInteger(n) && n >= 0 && n <= 10_000_000 ? n : undefined;
  };
  const univers = one('univers');
  const collection = one('collection');
  const contenance = one('contenance');
  const tri = one('tri') as ShopSort | undefined;
  const pour = one('pour') as ShopGender | undefined;
  const page = int('page');
  let min = int('min');
  let max = int('max');
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];

  return {
    univers: univers && SLUG.test(univers) ? univers : undefined,
    collection: collection && SLUG.test(collection) ? collection : undefined,
    min,
    max,
    contenance: contenance && /^\d+(\.\d+)?-(ml|g|unite)$/.test(contenance) ? contenance : undefined,
    familles: (one('familles') ?? '').split(',').filter((f) => SLUG.test(f)).slice(0, 8),
    pour: pour && SHOP_GENDERS.includes(pour) ? pour : undefined,
    promo: one('promo') === '1',
    tri: tri && SHOP_SORTS.includes(tri) ? tri : 'pertinence',
    page: page && page > 0 && page <= 50 ? page : 1,
  };
}

/** URL de la boutique avec des filtres modifiés ; les valeurs par défaut sont omises. */
export function shopHref(params: ShopParams, changes: Partial<ShopParams> = {}): string {
  const next = { ...params, page: 1, ...changes };
  const q = new URLSearchParams();
  if (next.univers) q.set('univers', next.univers);
  if (next.collection) q.set('collection', next.collection);
  if (next.min !== undefined) q.set('min', String(next.min));
  if (next.max !== undefined) q.set('max', String(next.max));
  if (next.contenance) q.set('contenance', next.contenance);
  if (next.familles.length) q.set('familles', next.familles.join(','));
  if (next.pour) q.set('pour', next.pour);
  if (next.promo) q.set('promo', '1');
  if (next.tri !== 'pertinence') q.set('tri', next.tri);
  if (next.page > 1) q.set('page', String(next.page));
  const s = q.toString();
  return s ? `/boutique?${s}` : '/boutique';
}

/** Nombre de filtres actifs (hors univers et tri), pour le badge « Filtres · 3 ». */
export function activeFilterCount(p: ShopParams): number {
  return (p.min !== undefined || p.max !== undefined ? 1 : 0) + (p.contenance ? 1 : 0) + p.familles.length + (p.pour ? 1 : 0) + (p.promo ? 1 : 0);
}

/** « 12-ml » ↔ { size: 12, unit: 'ML' } */
export function parseContenance(key: string): { size: number; unit: 'ML' | 'G' | 'UNITE' } | null {
  const m = key.match(/^(\d+(?:\.\d+)?)-(ml|g|unite)$/);
  return m ? { size: Number(m[1]), unit: m[2].toUpperCase() as 'ML' | 'G' | 'UNITE' } : null;
}

export function contenanceLabel(size: number, unit: 'ML' | 'G' | 'UNITE'): string {
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(size);
  return unit === 'ML' ? `${n} ml` : unit === 'G' ? `${n} g` : `${n} unité${size > 1 ? 's' : ''}`;
}
