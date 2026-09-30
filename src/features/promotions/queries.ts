import { cache } from 'react';
import { prisma } from '@/lib/prisma';

const targetSelect = {
  id: true,
  product: {
    select: {
      id: true,
      name: true,
      images: { orderBy: { position: 'asc' as const }, take: 1, select: { storagePath: true } },
    },
  },
  variant: {
    select: {
      id: true,
      label: true,
      product: {
        select: {
          id: true,
          name: true,
          images: { orderBy: { position: 'asc' as const }, take: 1, select: { storagePath: true } },
        },
      },
    },
  },
};

/**
 * Toutes les promotions (quelques dizaines au plus), avec leurs cibles et leur bilan :
 * nombre de commandes et total des remises accordées (commandes non annulées).
 */
export const listPromotions = cache(async () => {
  const [promotions, usage] = await Promise.all([
    prisma.promotion.findMany({
      where: { code: null },
      orderBy: [{ startsAt: 'desc' }],
      select: {
        id: true,
        name: true,
        type: true,
        value: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        targets: { select: targetSelect },
      },
    }),
    prisma.$queryRaw<{ promotion_id: string; orders: number; discount: number }[]>`
      SELECT i.promotion_id, count(DISTINCT i.order_id)::int AS orders, sum(i.unit_discount * i.quantity)::int AS discount
        FROM order_items i
        JOIN orders o ON o.id = i.order_id
       WHERE i.promotion_id IS NOT NULL AND o.status <> 'ANNULEE'
       GROUP BY i.promotion_id`,
  ]);

  const usageById = new Map(usage.map((u) => [u.promotion_id, { orders: u.orders, discount: u.discount }]));
  return promotions.map((promotion) => ({
    ...promotion,
    usage: usageById.get(promotion.id) ?? { orders: 0, discount: 0 },
  }));
});

export type PromotionRow = Awaited<ReturnType<typeof listPromotions>>[number];

/** Promotion à modifier (null si introuvable). */
export const getPromotionForEdit = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const promotion = await prisma.promotion.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      code: true,
      updatedAt: true,
      targets: { select: { productId: true, variantId: true } },
      _count: { select: { orderItems: true } },
    },
  });
  if (!promotion || promotion.code) return null;
  return {
    ...promotion,
    productIds: promotion.targets.flatMap((t) => (t.productId ? [t.productId] : [])),
    variantIds: promotion.targets.flatMap((t) => (t.variantId ? [t.variantId] : [])),
    usedInOrders: promotion._count.orderItems > 0,
    updatedAt: promotion.updatedAt.toISOString(),
  };
});

export type PromotionForEdit = NonNullable<Awaited<ReturnType<typeof getPromotionForEdit>>>;

/**
 * Données du sélecteur : produits non archivés (contenances actives, prix, photo),
 * catégories, et autres promotions actives ou à venir (détection des conflits).
 */
export async function getPromotionPickerData(excludePromotionId?: string) {
  const [products, categories, others] = await Promise.all([
    prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        isPublished: true,
        category: { select: { slug: true, name: true } },
        images: { orderBy: { position: 'asc' }, take: 1, select: { storagePath: true } },
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          select: { id: true, label: true, price: true },
        },
      },
    }),
    prisma.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { slug: true, name: true } }),
    prisma.promotion.findMany({
      where: {
        code: null,
        isActive: true,
        endsAt: { gt: new Date() },
        ...(excludePromotionId ? { id: { not: excludePromotionId } } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        value: true,
        startsAt: true,
        endsAt: true,
        targets: { select: { productId: true, variantId: true } },
      },
    }),
  ]);
  return { products: products.filter((p) => p.variants.length > 0), categories, others };
}

export type PromotionPickerData = Awaited<ReturnType<typeof getPromotionPickerData>>;
