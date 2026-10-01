import type { ShopProduct } from './queries';

export type Featured = { id: string; reason: 'promo' | 'jour' };

/**
 * Produit mis en vitrine à l'arrivée sur la boutique (là où l'on compare et
 * achète, la promotion passe en premier) :
 * - la plus forte promotion en cours (en stock) ;
 * - sinon le produit du jour (voir pickOfTheDay).
 */
export function pickFeatured(products: ShopProduct[], now = new Date()): Featured | null {
  const available = products.filter((p) => p.inStock);
  const pool = available.length ? available : products;
  if (pool.length === 0) return null;

  const promo = pool
    .filter((p) => p.bestPercent)
    .sort((a, b) => (b.bestPercent ?? 0) - (a.bestPercent ?? 0) || a.fromPrice - b.fromPrice)[0];
  if (promo) return { id: promo.id, reason: 'promo' };

  const day = pickOfTheDay(pool, now);
  return day ? { id: day.id, reason: 'jour' } : null;
}

/**
 * Produit du jour, en tour de rôle : chaque création en stock passe une fois
 * par cycle (4 produits = une fois tous les 4 jours), sans répétition ni oubli,
 * dans le même ordre pour tous. Le jour change à minuit, heure de Dakar (UTC).
 * Une création en promotion reste dans le cycle, sans le monopoliser.
 */
export function pickOfTheDay(products: ShopProduct[], now = new Date()): ShopProduct | null {
  const available = products.filter((p) => p.inStock);
  const pool = (available.length ? available : products).slice().sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) return null;
  const day = Math.floor(now.getTime() / 86_400_000);
  return pool[day % pool.length];
}
