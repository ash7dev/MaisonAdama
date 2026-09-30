import type { ShopProduct } from './queries';

export type Featured = { id: string; reason: 'promo' | 'jour' };

/**
 * Produit mis en vitrine à l'arrivée sur la boutique :
 * - la plus forte promotion en cours (en stock) ;
 * - sinon un « produit du jour », tiré parmi les produits en stock, qui change
 *   chaque jour à minuit (heure de Dakar = UTC) et reste le même pour tous
 *   les visiteurs de la journée.
 */
export function pickFeatured(products: ShopProduct[], now = new Date()): Featured | null {
  const available = products.filter((p) => p.inStock);
  const pool = available.length ? available : products;
  if (pool.length === 0) return null;

  const promo = pool
    .filter((p) => p.bestPercent)
    .sort((a, b) => (b.bestPercent ?? 0) - (a.bestPercent ?? 0) || a.fromPrice - b.fromPrice)[0];
  if (promo) return { id: promo.id, reason: 'promo' };

  // Tirage stable : même jour + mêmes produits = même résultat.
  const day = now.toISOString().slice(0, 10);
  const ids = pool.map((p) => p.id).sort();
  const seed = [...`${day}:${ids.join(',')}`].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 2166136261);
  return { id: ids[seed % ids.length], reason: 'jour' };
}
