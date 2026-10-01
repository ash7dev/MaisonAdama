import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';

export type AdminCounts = {
  /** Commandes EN_ATTENTE : à confirmer par téléphone ou WhatsApp. */
  ordersToConfirm: number;
  /** Paiements Wave non encore constatés (hors commandes annulées). */
  waveToVerify: number;
  waveToVerifyAmount: number;
  /** Variantes actives au stock inférieur ou égal à leur seuil d'alerte. */
  lowStock: number;
};

export const ADMIN_COUNTS_TAG = 'admin-counts';

/** Compteurs de la navigation et du tableau de bord. */
export const getAdminCounts = cache(async (): Promise<AdminCounts> => {
  return unstable_cache(
    async () => withDbRetry(async () => {
      const waveWhere = {
        paymentMethod: PaymentMethod.WAVE,
        paymentStatus: PaymentStatus.NON_PAYE,
        status: { not: OrderStatus.ANNULEE },
      };

      const [ordersToConfirm, wave, lowStockRows] = await Promise.all([
        prisma.order.count({ where: { status: OrderStatus.EN_ATTENTE } }),
        prisma.order.aggregate({ where: waveWhere, _count: true, _sum: { total: true } }),
        // Comparaison entre deux colonnes : hors de portée du query builder Prisma.
        // Couvert par l'index partiel product_variants_low_stock_idx.
        prisma.$queryRaw<{ count: number }[]>`
          SELECT count(*)::int AS count
            FROM product_variants v
            JOIN products p ON p.id = v.product_id
           WHERE v.is_active AND NOT p.is_archived AND v.stock <= v.low_stock_threshold`,
      ]);

      return {
        ordersToConfirm,
        waveToVerify: wave._count,
        waveToVerifyAmount: wave._sum.total ?? 0,
        lowStock: lowStockRows[0]?.count ?? 0,
      };
    }),
    ['admin-counts-summary'],
    { revalidate: 30, tags: [ADMIN_COUNTS_TAG] }
  )();
});

/** Premier jour du mois courant, heure de Dakar (UTC+0 toute l'année). */
function startOfMonthDakar(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMonthRevenue() {
  const result = await prisma.order.aggregate({
    where: { paymentStatus: PaymentStatus.PAYE, paidAt: { gte: startOfMonthDakar() } },
    _sum: { total: true },
    _count: true,
  });
  const revenue = result._sum.total ?? 0;
  const paidOrders = result._count;
  return { revenue, paidOrders, averageBasket: paidOrders ? Math.round(revenue / paidOrders) : 0 };
}

export function getRecentOrders(limit = 5) {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      total: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      createdAt: true,
    },
  });
}
