import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CATALOG_OPTIONS_TAG } from './get-product-form-options';

export const PRODUCT_STATUSES = ['tous', 'publies', 'brouillons', 'stock-bas', 'archives'] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_SORTS = ['recents', 'modifies', 'nom', 'anciens'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PRODUCTS_PER_PAGE = 20;

export type ProductListParams = {
  q?: string;
  status: ProductStatusFilter;
  category?: string;
  sort: ProductSort;
  page: number;
};

/** Lit et normalise les paramètres d'URL (toute valeur inconnue retombe sur le défaut). */
export function parseProductListParams(searchParams: Record<string, string | string[] | undefined>): ProductListParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const status = one('statut') as ProductStatusFilter | undefined;
  const sort = one('tri') as ProductSort | undefined;
  const page = Number(one('page'));
  return {
    q: one('q')?.slice(0, 80),
    status: status && PRODUCT_STATUSES.includes(status) ? status : 'tous',
    category: one('categorie'),
    sort: sort && PRODUCT_SORTS.includes(sort) ? sort : 'recents',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

const ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  recents: [{ createdAt: 'desc' }],
  modifies: [{ updatedAt: 'desc' }],
  nom: [{ name: 'asc' }],
  anciens: [{ createdAt: 'asc' }],
};

import { cache } from 'react';

/** Identifiants des produits dont une variante active est sous son seuil d'alerte. */
const lowStockProductIds = cache(async (): Promise<string[]> => {
  return unstable_cache(
    async () => {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT DISTINCT v.product_id AS id
          FROM product_variants v
         WHERE v.is_active AND v.stock <= v.low_stock_threshold`;
      return rows.map((row) => row.id);
    },
    ['low-stock-product-ids'],
    { revalidate: 30, tags: ['low-stock-product-ids'] }
  )();
});

/**
 * Recherche sans accents sur nom + mots-clés (index products_search_trgm_idx),
 * et sur les références (SKU) des variantes.
 */
async function searchProductIds(q: string): Promise<string[]> {
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM products p
     WHERE product_search_text(p.name, p.search_keywords) LIKE '%' || normalize_search(${escaped}) || '%'
    UNION
    SELECT v.product_id FROM product_variants v
     WHERE v.sku ILIKE ${`%${escaped}%`}`;
  return rows.map((row) => row.id);
}

export const listAdminProducts = cache(async (params: ProductListParams) => {
  const [lowStockIds, searchIds] = await Promise.all([
    lowStockProductIds(),
    params.q ? searchProductIds(params.q) : Promise.resolve(null),
  ]);

  // Filtres communs (recherche, catégorie) : s'appliquent aussi aux compteurs des onglets.
  const base: Prisma.ProductWhereInput = {
    ...(searchIds ? { id: { in: searchIds } } : {}),
    ...(params.category ? { category: { slug: params.category } } : {}),
  };

  const byStatus: Record<ProductStatusFilter, Prisma.ProductWhereInput> = {
    tous: { isArchived: false },
    publies: { isPublished: true },
    brouillons: { isPublished: false, isArchived: false },
    'stock-bas': { isArchived: false, id: { in: lowStockIds } },
    archives: { isArchived: true },
  };

  // Recherche + stock bas : intersection des deux listes d'identifiants.
  const where: Prisma.ProductWhereInput = { AND: [base, byStatus[params.status]] };

  // Compteurs des onglets en 2 requêtes (au lieu d'une par onglet) :
  // un regroupement publié / archivé, et le nombre de produits en stock bas.
  const [products, groups, lowStockCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: ORDER_BY[params.sort],
      skip: (params.page - 1) * PRODUCTS_PER_PAGE,
      take: PRODUCTS_PER_PAGE,
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
        isArchived: true,
        updatedAt: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { orderBy: { position: 'asc' }, take: 1, select: { storagePath: true, alt: true } },
        _count: { select: { images: true } },
        variants: {
          orderBy: { position: 'asc' },
          select: { id: true, label: true, price: true, stock: true, lowStockThreshold: true, isActive: true, sku: true },
        },
      },
    }),
    prisma.product.groupBy({ by: ['isPublished', 'isArchived'], where: base, _count: { _all: true } }),
    prisma.product.count({ where: { AND: [base, byStatus['stock-bas']] } }),
  ]);

  const sum = (match: (g: (typeof groups)[number]) => boolean) =>
    groups.filter(match).reduce((total, g) => total + g._count._all, 0);
  const statusCounts: Record<ProductStatusFilter, number> = {
    tous: sum((g) => !g.isArchived),
    publies: sum((g) => g.isPublished),
    brouillons: sum((g) => !g.isPublished && !g.isArchived),
    'stock-bas': lowStockCount,
    archives: sum((g) => g.isArchived),
  };
  const total = statusCounts[params.status];

  return {
    products,
    total,
    statusCounts,
    pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)),
  };
});

export type AdminProductRow = Awaited<ReturnType<typeof listAdminProducts>>['products'][number];

export const listCategoriesForFilter = unstable_cache(
  () =>
    prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { name: true, slug: true },
    }),
  ['product-filter-categories'],
  { revalidate: 300, tags: [CATALOG_OPTIONS_TAG] },
);
