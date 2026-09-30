import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { contenanceLabel, parseContenance, SHOP_PAGE_SIZE, type ShopParams } from './params';

/**
 * Catalogue public de la boutique : 100 % serveur.
 *
 * Prix : chaque contenance passe par variant_best_offer() — la MÊME fonction
 * SQL que celle qui contrôle les lignes de commande. Le prix affiché est donc
 * exactement celui qui sera facturé (meilleure promotion, sans cumul).
 *
 * Visibles : produits publiés, non archivés, avec au moins une contenance active.
 */

export const SHOP_TAG = 'shop-catalog';

export type ShopVariant = {
  id: string;
  label: string;
  size: number;
  unit: 'ML' | 'G' | 'UNITE';
  price: number;
  discount: number;
  promotionName: string | null;
  stock: number;
};

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  categoryName: string;
  categorySlug: string;
  /** Prix final le plus bas (promotion déduite). */
  fromPrice: number;
  toPrice: number;
  /** Plus forte remise en % parmi les contenances (badge « −20 % »). */
  bestPercent: number | null;
  inStock: boolean;
  isNew: boolean;
  /** Date de mise en ligne (ISO), pour le journal des arrivages. */
  publishedAt: string | null;
  /** Unités vendues sur 90 jours (commandes non annulées), pour le classement. */
  sold: number;
  variants: ShopVariant[];
  images: Array<{ path: string; alt: string | null }>;
  families: string[];
};

type Row = {
  id: string; slug: string; name: string; short_description: string | null; published_at: Date | null;
  category_name: string; category_slug: string; from_price: number; to_price: number; best_pct: number | null;
  in_stock: boolean; variants: ShopVariant[]; images: Array<{ path: string; alt: string | null }>; families: string[]; total: number;
  sold?: number;
};

const NEW_DAYS = 30;

function whereClause(p: ShopParams): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (p.univers) conds.push(Prisma.sql`c.slug = ${p.univers}`);
  if (p.collection) {
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM product_collections pc JOIN collections col ON col.id = pc.collection_id
                                   WHERE pc.product_id = p.id AND col.is_active AND col.slug = ${p.collection})`);
  }
  if (p.min !== undefined) conds.push(Prisma.sql`a.from_price >= ${p.min}`);
  if (p.max !== undefined) conds.push(Prisma.sql`a.from_price <= ${p.max}`);
  const size = p.contenance ? parseContenance(p.contenance) : null;
  if (size) {
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM product_variants v
                                   WHERE v.product_id = p.id AND v.is_active
                                     AND v.size = ${size.size}::numeric AND v.unit = ${size.unit}::variant_unit)`);
  }
  if (p.familles.length) {
    conds.push(Prisma.sql`EXISTS (SELECT 1 FROM product_olfactory_families pf JOIN olfactory_families f ON f.id = pf.family_id
                                   WHERE pf.product_id = p.id AND f.slug = ANY(${p.familles}::text[]))`);
  }
  if (p.pour === 'femme') conds.push(Prisma.sql`p.gender IN ('FEMME', 'UNISEXE')`);
  if (p.pour === 'homme') conds.push(Prisma.sql`p.gender IN ('HOMME', 'UNISEXE')`);
  if (p.pour === 'mixte') conds.push(Prisma.sql`p.gender = 'UNISEXE'`);
  if (p.promo) conds.push(Prisma.sql`a.best_discount > 0`);
  return Prisma.join(conds, ' AND ');
}

const ORDER: Record<ShopParams['tri'], Prisma.Sql> = {
  // Disponibles d'abord, puis les plus vendus (90 jours), puis les plus récents.
  pertinence: Prisma.sql`a.in_stock DESC, sold DESC, p.published_at DESC NULLS LAST, p.name`,
  nouveautes: Prisma.sql`a.in_stock DESC, p.published_at DESC NULLS LAST, p.name`,
  'prix-croissant': Prisma.sql`a.in_stock DESC, a.from_price ASC, p.name`,
  'prix-decroissant': Prisma.sql`a.in_stock DESC, a.from_price DESC, p.name`,
};

async function queryProducts(p: ShopParams) {
  const limit = p.page * SHOP_PAGE_SIZE;
  const rows = await prisma.$queryRaw<Row[]>`
    WITH offers AS (
      SELECT v.product_id, v.id, v.label, v.size, v.unit, v.position, v.stock,
             o.unit_price, o.unit_discount, o.promotion_name
        FROM product_variants v
        JOIN products pp ON pp.id = v.product_id
       CROSS JOIN LATERAL variant_best_offer(v.id) o
       WHERE v.is_active AND pp.is_published AND NOT pp.is_archived
    ),
    agg AS (
      SELECT product_id,
             min(unit_price - unit_discount)                                                  AS from_price,
             max(unit_price - unit_discount)                                                  AS to_price,
             max(unit_discount)                                                               AS best_discount,
             max(CASE WHEN unit_discount > 0 THEN round(100.0 * unit_discount / unit_price) END) AS best_pct,
             bool_or(stock > 0)                                                               AS in_stock,
             jsonb_agg(jsonb_build_object(
               'id', id, 'label', label, 'size', size, 'unit', unit, 'price', unit_price,
               'discount', unit_discount, 'promotionName', promotion_name, 'stock', stock
             ) ORDER BY position, size)                                                        AS variants
        FROM offers
       GROUP BY product_id
    ),
    sales AS (
      SELECT i.product_id, sum(i.quantity) AS sold
        FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.status <> 'ANNULEE' AND o.created_at >= now() - interval '90 days'
       GROUP BY i.product_id
    )
    SELECT p.id, p.slug, p.name, p.short_description, p.published_at,
           c.name AS category_name, c.slug AS category_slug,
           a.from_price::int AS from_price, a.to_price::int AS to_price, a.best_pct::int AS best_pct,
           a.in_stock, a.variants,
           coalesce((SELECT jsonb_agg(jsonb_build_object('path', im.storage_path, 'alt', im.alt) ORDER BY im.position)
                       FROM (SELECT storage_path, alt, position FROM product_images pi
                              WHERE pi.product_id = p.id ORDER BY position LIMIT 2) im), '[]'::jsonb) AS images,
           coalesce((SELECT jsonb_agg(f.name ORDER BY f.position)
                       FROM product_olfactory_families pf JOIN olfactory_families f ON f.id = pf.family_id
                      WHERE pf.product_id = p.id), '[]'::jsonb) AS families,
           coalesce(s.sold, 0)::int AS sold,
           count(*) OVER ()::int AS total
      FROM products p
      JOIN agg a        ON a.product_id = p.id
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN sales s ON s.product_id = p.id
     WHERE ${whereClause(p)}
     ORDER BY ${ORDER[p.tri]}
     LIMIT ${limit}`;

  const newSince = Date.now() - NEW_DAYS * 86_400_000;
  const products: ShopProduct[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortDescription: r.short_description,
    categoryName: r.category_name,
    categorySlug: r.category_slug,
    fromPrice: r.from_price,
    toPrice: r.to_price,
    bestPercent: r.best_pct,
    inStock: r.in_stock,
    isNew: r.published_at ? r.published_at.getTime() >= newSince : false,
    publishedAt: r.published_at ? r.published_at.toISOString() : null,
    sold: r.sold ?? 0,
    variants: r.variants.map((v) => ({ ...v, size: Number(v.size) })),
    images: r.images,
    families: r.families,
  }));
  const total = rows[0]?.total ?? 0;
  return { products, total, hasMore: total > products.length };
}

export const listShopProducts = (p: ShopParams) =>
  unstable_cache(() => queryProducts(p), ['shop-products', JSON.stringify(p)], { revalidate: 60, tags: [SHOP_TAG] })();

export type ShopListing = Awaited<ReturnType<typeof queryProducts>>;

// -----------------------------------------------------------------------------
//  Options des filtres (univers, familles, contenances, bornes de prix)
// -----------------------------------------------------------------------------

async function queryFacets() {
  const [univers, families, sizes, [bounds]] = await Promise.all([
    prisma.$queryRaw<{ slug: string; name: string; count: number }[]>`
      SELECT c.slug, c.name, count(DISTINCT p.id)::int AS count
        FROM categories c
        JOIN products p ON p.category_id = c.id AND p.is_published AND NOT p.is_archived
       WHERE c.is_active
         AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.is_active)
       GROUP BY c.slug, c.name, c.position
       ORDER BY c.position, c.name`,
    prisma.$queryRaw<{ slug: string; name: string; count: number }[]>`
      SELECT f.slug, f.name, count(DISTINCT p.id)::int AS count
        FROM olfactory_families f
        JOIN product_olfactory_families pf ON pf.family_id = f.id
        JOIN products p ON p.id = pf.product_id AND p.is_published AND NOT p.is_archived
       GROUP BY f.slug, f.name, f.position
       ORDER BY f.position, f.name`,
    prisma.$queryRaw<{ size: number; unit: 'ML' | 'G' | 'UNITE'; count: number }[]>`
      SELECT v.size::float8 AS size, v.unit::text AS unit, count(DISTINCT p.id)::int AS count
        FROM product_variants v
        JOIN products p ON p.id = v.product_id AND p.is_published AND NOT p.is_archived
       WHERE v.is_active
       GROUP BY v.size, v.unit
       ORDER BY v.unit, v.size`,
    prisma.$queryRaw<[{ min: number | null; max: number | null; total: number; q1: number | null; q2: number | null }]>`
      WITH per_product AS (
        SELECT p.id, min(v.price) AS from_price, max(v.price) AS to_price
          FROM product_variants v
          JOIN products p ON p.id = v.product_id AND p.is_published AND NOT p.is_archived
         WHERE v.is_active
         GROUP BY p.id
      )
      SELECT min(from_price)::int AS min, max(to_price)::int AS max, count(*)::int AS total,
             percentile_cont(1.0 / 3) WITHIN GROUP (ORDER BY from_price)::float8 AS q1,
             percentile_cont(2.0 / 3) WITHIN GROUP (ORDER BY from_price)::float8 AS q2
        FROM per_product`,
  ]);
  return {
    total: bounds.total,
    univers,
    families,
    sizes: sizes.map((s) => ({
      key: `${s.size}-${s.unit.toLowerCase()}`,
      label: contenanceLabel(s.size, s.unit),
      count: s.count,
    })),
    priceMin: bounds.min ?? 0,
    priceMax: bounds.max ?? 0,
    budgets: budgetTiers(bounds.q1, bounds.q2),
  };
}

/**
 * Trois budgets calculés sur les vrais prix (tiers du catalogue), arrondis à
 * un montant rond : « moins de 15 000 », « 15 000 à 25 000 », « plus de 25 000 ».
 */
function budgetTiers(q1: number | null, q2: number | null) {
  if (q1 === null || q2 === null) return [];
  const round = (n: number) => Math.max(1000, Math.round(n / 5000) * 5000 || Math.round(n / 1000) * 1000);
  let a = round(q1);
  let b = round(q2);
  if (b <= a) b = a + 5000;
  if (a === b) return [];
  const f = new Intl.NumberFormat('fr-FR');
  return [
    { key: 'petit', label: `Moins de ${f.format(a)}\u00A0FCFA`, min: undefined, max: a - 1 },
    { key: 'moyen', label: `${f.format(a)} à ${f.format(b)}\u00A0FCFA`, min: a, max: b },
    { key: 'grand', label: `Plus de ${f.format(b)}\u00A0FCFA`, min: b + 1, max: undefined },
  ] as Array<{ key: string; label: string; min: number | undefined; max: number | undefined }>;
}

export const getShopFacets = unstable_cache(queryFacets, ['shop-facets'], { revalidate: 300, tags: [SHOP_TAG] });

export type ShopFacets = Awaited<ReturnType<typeof queryFacets>>;

// -----------------------------------------------------------------------------
//  Roue olfactive : toutes les familles, même sans produit (segment grisé)
// -----------------------------------------------------------------------------

async function queryFamilyWheel() {
  return prisma.$queryRaw<{ slug: string; name: string; count: number }[]>`
    SELECT f.slug, f.name, count(DISTINCT p.id)::int AS count
      FROM olfactory_families f
      LEFT JOIN product_olfactory_families pf ON pf.family_id = f.id
      LEFT JOIN products p ON p.id = pf.product_id AND p.is_published AND NOT p.is_archived
     GROUP BY f.slug, f.name, f.position
     ORDER BY f.position, f.name`;
}

export const getFamilyWheel = unstable_cache(queryFamilyWheel, ['shop-family-wheel'], { revalidate: 300, tags: [SHOP_TAG] });

export type WheelFamily = Awaited<ReturnType<typeof queryFamilyWheel>>[number];

// -----------------------------------------------------------------------------
//  Fiche produit
// -----------------------------------------------------------------------------

export type ShopProductDetail = ShopProduct & {
  description: string | null;
  gender: 'HOMME' | 'FEMME' | 'UNISEXE' | null;
  concentration: 'EAU_DE_TOILETTE' | 'EAU_DE_PARFUM' | 'EXTRAIT' | null;
  seoTitle: string | null;
  seoDescription: string | null;
  familySlugs: string[];
  allImages: Array<{ path: string; alt: string | null; width: number | null; height: number | null }>;
};

type DetailRow = Row & {
  description: string | null;
  gender: ShopProductDetail['gender'];
  concentration: ShopProductDetail['concentration'];
  seo_title: string | null;
  seo_description: string | null;
  family_slugs: string[];
  all_images: ShopProductDetail['allImages'];
};

async function queryProductDetail(slug: string): Promise<ShopProductDetail | null> {
  const [r] = await prisma.$queryRaw<DetailRow[]>`
    WITH offers AS (
      SELECT v.product_id, v.id, v.label, v.size, v.unit, v.position, v.stock,
             o.unit_price, o.unit_discount, o.promotion_name
        FROM product_variants v
        JOIN products pp ON pp.id = v.product_id
       CROSS JOIN LATERAL variant_best_offer(v.id) o
       WHERE v.is_active AND pp.slug = ${slug} AND pp.is_published AND NOT pp.is_archived
    ),
    agg AS (
      SELECT product_id,
             min(unit_price - unit_discount) AS from_price,
             max(unit_price - unit_discount) AS to_price,
             max(CASE WHEN unit_discount > 0 THEN round(100.0 * unit_discount / unit_price) END) AS best_pct,
             bool_or(stock > 0) AS in_stock,
             jsonb_agg(jsonb_build_object(
               'id', id, 'label', label, 'size', size, 'unit', unit, 'price', unit_price,
               'discount', unit_discount, 'promotionName', promotion_name, 'stock', stock
             ) ORDER BY position, size) AS variants
        FROM offers GROUP BY product_id
    )
    SELECT p.id, p.slug, p.name, p.short_description, p.description, p.published_at,
           p.gender::text AS gender, p.concentration::text AS concentration,
           p.seo_title, p.seo_description,
           c.name AS category_name, c.slug AS category_slug,
           a.from_price::int AS from_price, a.to_price::int AS to_price, a.best_pct::int AS best_pct,
           a.in_stock, a.variants,
           coalesce((SELECT jsonb_agg(jsonb_build_object('path', storage_path, 'alt', alt, 'width', width, 'height', height) ORDER BY position)
                       FROM product_images pi WHERE pi.product_id = p.id), '[]'::jsonb) AS all_images,
           '[]'::jsonb AS images,
           coalesce((SELECT jsonb_agg(f.name ORDER BY f.position) FROM product_olfactory_families pf
                       JOIN olfactory_families f ON f.id = pf.family_id WHERE pf.product_id = p.id), '[]'::jsonb) AS families,
           coalesce((SELECT jsonb_agg(f.slug ORDER BY f.position) FROM product_olfactory_families pf
                       JOIN olfactory_families f ON f.id = pf.family_id WHERE pf.product_id = p.id), '[]'::jsonb) AS family_slugs,
           1 AS total
      FROM products p
      JOIN agg a        ON a.product_id = p.id
      JOIN categories c ON c.id = p.category_id`;
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortDescription: r.short_description,
    description: r.description,
    categoryName: r.category_name,
    categorySlug: r.category_slug,
    fromPrice: r.from_price,
    toPrice: r.to_price,
    bestPercent: r.best_pct,
    inStock: r.in_stock,
    isNew: r.published_at ? r.published_at.getTime() >= Date.now() - NEW_DAYS * 86_400_000 : false,
    publishedAt: r.published_at ? r.published_at.toISOString() : null,
    sold: 0,
    variants: r.variants.map((v) => ({ ...v, size: Number(v.size) })),
    images: r.all_images.slice(0, 2).map((i) => ({ path: i.path, alt: i.alt })),
    allImages: r.all_images,
    families: r.families,
    familySlugs: r.family_slugs,
    gender: r.gender,
    concentration: r.concentration,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
  };
}

export const getShopProduct = (slug: string) =>
  unstable_cache(() => queryProductDetail(slug), ['shop-product', slug], { revalidate: 60, tags: [SHOP_TAG] })();

/** « Vous aimerez aussi » : même univers d'abord, complété par le reste de la boutique. */
export async function getRelatedProducts(product: ShopProductDetail, count = 4): Promise<ShopProduct[]> {
  const base = { familles: product.familySlugs.slice(0, 3), promo: false, tri: 'pertinence' as const, page: 1 };
  const [sameFamilies, sameUnivers, all] = await Promise.all([
    product.familySlugs.length ? listShopProducts(base) : Promise.resolve({ products: [] as ShopProduct[] }),
    listShopProducts({ ...base, familles: [], univers: product.categorySlug }),
    listShopProducts({ ...base, familles: [] }),
  ]);
  const seen = new Set([product.id]);
  const out: ShopProduct[] = [];
  for (const p of [...sameFamilies.products, ...sameUnivers.products, ...all.products]) {
    if (seen.has(p.id) || !p.inStock) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length === count) break;
  }
  return out;
}

// -----------------------------------------------------------------------------
//  Collections éditoriales
// -----------------------------------------------------------------------------

export type ShopCollection = { slug: string; name: string; description: string | null };

export const getCollection = (slug: string) =>
  unstable_cache(
    async (): Promise<ShopCollection | null> =>
      prisma.collection.findFirst({ where: { slug, isActive: true }, select: { slug: true, name: true, description: true } }),
    ['shop-collection', slug],
    { revalidate: 300, tags: [SHOP_TAG] },
  )();
