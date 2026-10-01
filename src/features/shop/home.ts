import type { ShopParams } from './params';
import { SHOP_CATEGORIES } from '@/components/layout/nav-config';
import { getShopFacets, listShopProducts, type ShopProduct } from './queries';


/**
 * Données de la page d'accueil (« Les alcôves ») : tout est calculé côté
 * serveur à partir des requêtes en cache de la boutique. Chaque cas vide a
 * sa réponse (niche vide, pas de produit du jour, collection sans contenu).
 */

const BASE: ShopParams = { familles: [], promo: false, tri: 'pertinence', page: 1 };
const RECENT_DAYS = 90;
const FRESH_DAYS = 7;

/** Niches du mur (hors grande niche centrale). */
export const NICHES = 4;

/** Un univers et son nombre de créations (0 = « bientôt »). */
export type UniversPlate = { slug: string; label: string; count: number };

/** Un rayon de la Maison : un univers et ses créations (disponibles d'abord). */
export type Rayon = { slug: string; label: string; hint: string; count: number; products: ShopProduct[] };

export type Ticket = {
  key: 'nouveautes' | 'best-sellers' | 'idees-cadeaux';
  num: string;
  name: string;
  href: string;
  lines: [string, string];
  product: ShopProduct | null;
  /** Tampon : « COMPOSTÉ jj.mm » (arrivage frais) ou « BIENTÔT » (rien à montrer). */
  stamp: { label: string; value: string; tone: 'rouge' | 'or' } | null;
};

export type HomeData = {
  total: number;
  /** Les créations des petites niches (en stock d'abord, les plus demandées). */
  niches: ShopProduct[];
  /** Les cinq univers, avec leur nombre de créations (0 = « bientôt »). */
  univers: UniversPlate[];
  /** Produit du jour sous la lampe (tour de rôle quotidien, promotions comprises). */
  featured: { product: ShopProduct } | null;
  /** « Ce soir sur l'étagère » : sélection de la Maison, tous univers (voir les règles). */
  tonight: ShopProduct[];
  /** Les cinq rayons, toujours tous présents (un rayon vide a son état vide). */
  rayons: Rayon[];
  tickets: Ticket[];
};

const num = new Intl.NumberFormat('fr-FR');
const dayMonth = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`; // Dakar = UTC
};

export async function getHomeData(now = new Date()): Promise<HomeData> {
  const [facets, all, newest, gifts, ...perUnivers] = await Promise.all([
    getShopFacets(),
    // Jusqu'à 96 créations : de quoi faire tourner les niches sur tout le catalogue.
    listShopProducts({ ...BASE, page: 4 }),
    listShopProducts({ ...BASE, tri: 'nouveautes' }),
    listShopProducts({ ...BASE, collection: 'idees-cadeaux' }),
    ...SHOP_CATEGORIES.map((c) => listShopProducts({ ...BASE, univers: c.slug })),
  ]);

  const rayons: Rayon[] = SHOP_CATEGORIES.map((c, i) => ({
    slug: c.slug,
    label: c.label,
    hint: c.hint,
    count: perUnivers[i].total,
    products: perUnivers[i].products
      .slice()
      .sort((a, b) => Number(b.inStock) - Number(a.inStock))
      .slice(0, 12),
  }));

  const counts = new Map(facets.univers.map((u) => [u.slug, u.count]));
  const univers: UniversPlate[] = SHOP_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label, count: counts.get(c.slug) ?? 0 }));

  // ─── Le mur : produit du jour + 4 niches, en tour de rôle quotidien ───
  // Même cycle que la lampe : chaque jour, la création suivante passe sous la
  // lampe et les quatre d'après occupent les niches. Toutes y passent.
  const { featured: day, niches } = rotateWall(all.products, now);
  const featured = day ? { product: day } : null;
  // « Ce soir sur l'étagère », règles d'affichage (doublons avec le mur et les
  // rayons acceptés) :
  //   1. créations en stock uniquement, 12 au plus ;
  //   2. promotions en cours d'abord (la plus forte remise en premier) ;
  //   3. puis les plus vendues (90 jours) ;
  //   4. puis les nouveautés (moins de 30 jours) ;
  //   5. puis le reste, dans l'ordre de pertinence de la boutique.
  const rank = (p: ShopProduct) => (p.bestPercent ? 0 : p.sold > 0 ? 1 : p.isNew ? 2 : 3);
  const tonight = all.products
    .filter((p) => p.inStock)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || (b.p.bestPercent ?? 0) - (a.p.bestPercent ?? 0) || b.p.sold - a.p.sold || a.i - b.i)
    .map(({ p }) => p)
    .slice(0, 12);

  // ─── Billets d'entrée ───
  const empty = facets.total === 0;
  const soon = { label: 'BIENTÔT', value: '✦', tone: 'or' as const };

  const dated = newest.products.filter((p) => p.publishedAt).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!));
  const latest = dated[0] ?? null;
  const recent = dated.filter((p) => now.getTime() - Date.parse(p.publishedAt!) <= RECENT_DAYS * 86_400_000).length;
  const fresh = latest && now.getTime() - Date.parse(latest.publishedAt!) <= FRESH_DAYS * 86_400_000;

  const ranked = all.products.filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold);
  const leader = ranked[0] ?? null;

  const giftPool = gifts.total > 0 ? gifts.products : all.products.filter((p) => p.inStock);
  const cheapest = [...giftPool].sort((a, b) => a.fromPrice - b.fromPrice)[0] ?? null;

  const tickets: Ticket[] = [
    {
      key: 'nouveautes',
      num: '01',
      name: 'Nouveautés',
      href: '/collections/nouveautes',
      product: latest,
      lines: empty || !latest
        ? ['Premier arrivage', 'en préparation']
        : [recent > 0 ? `Admission : ${num.format(recent)} création${recent > 1 ? 's' : ''}` : 'Prochain arrivage en préparation', `Dernière arrivée : ${latest.name}`],
      stamp: empty ? soon : fresh && latest ? { label: 'COMPOSTÉ', value: dayMonth(latest.publishedAt!), tone: 'rouge' } : null,
    },
    {
      key: 'best-sellers',
      num: '02',
      name: 'Best-sellers',
      href: '/collections/best-sellers',
      product: leader,
      lines: leader ? ['Admission : le podium', `N°1 : ${leader.name}`] : ['Le podium attend', 'ses premiers flacons'],
      stamp: empty ? soon : null,
    },
    {
      key: 'idees-cadeaux',
      num: '03',
      name: 'Idées cadeaux',
      href: '/collections/idees-cadeaux',
      product: cheapest,
      lines: cheapest
        ? [facets.budgets.length > 1 ? `Admission : ${facets.budgets.length} budgets` : 'Admission : nos idées', `Dès ${num.format(cheapest.fromPrice)} FCFA`]
        : ['La sélection', 'se prépare'],
      stamp: empty ? soon : null,
    },
  ];

  return { total: facets.total, niches, univers, featured, tonight, rayons, tickets };
}

/**
 * Tour de rôle du mur : créations en stock triées de façon stable, le jour
 * (heure de Dakar = UTC) donne la position de départ du cycle.
 */
export function rotateWall(products: ShopProduct[], now = new Date()): { featured: ShopProduct | null; niches: ShopProduct[] } {
  const available = products.filter((p) => p.inStock);
  const pool = (available.length ? available : products).slice().sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length === 0) return { featured: null, niches: [] };
  const start = Math.floor(now.getTime() / 86_400_000) % pool.length;
  const cycle = pool.slice(start).concat(pool.slice(0, start));
  return { featured: cycle[0], niches: cycle.slice(1, 1 + NICHES) };
}

/** « Ce matin », « Cet après-midi », « Ce soir » : l'heure de Dakar (UTC+0). */
export function momentOfDay(now = new Date()): string {
  const h = now.getUTCHours();
  if (h >= 5 && h < 12) return 'Ce matin';
  if (h >= 12 && h < 18) return 'Cet après-midi';
  return 'Ce soir';
}

export type TopPromotion = { slug: string; name: string; percent: number };

/** La plus forte promotion en cours sur une création en stock (bandeau d'annonce). */
export async function getTopPromotion(): Promise<TopPromotion | null> {
  const { products } = await listShopProducts(BASE);
  const best = products
    .filter((p) => p.inStock && p.bestPercent)
    .sort((a, b) => (b.bestPercent ?? 0) - (a.bestPercent ?? 0) || a.fromPrice - b.fromPrice)[0];
  return best ? { slug: best.slug, name: best.name, percent: best.bestPercent! } : null;
}
