import { cache } from 'react';
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// -----------------------------------------------------------------------------
//  Liste
// -----------------------------------------------------------------------------

export const ORDER_TABS = ['toutes', 'a-confirmer', 'a-expedier', 'en-livraison', 'livrees', 'annulees'] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const ORDERS_PER_PAGE = 20;

export type OrderListParams = {
  tab: OrderTab;
  q?: string;
  /** Filtre transversal : paiements Wave à vérifier. */
  waveToVerify: boolean;
  page: number;
};

const TAB_STATUS: Record<Exclude<OrderTab, 'toutes'>, OrderStatus> = {
  'a-confirmer': OrderStatus.EN_ATTENTE,
  'a-expedier': OrderStatus.CONFIRMEE,
  'en-livraison': OrderStatus.EN_LIVRAISON,
  livrees: OrderStatus.LIVREE,
  annulees: OrderStatus.ANNULEE,
};

/** Files de travail : la commande la plus ancienne d'abord, pour qu'aucun client n'attende. */
const QUEUE_TABS: OrderTab[] = ['a-confirmer', 'a-expedier', 'en-livraison'];

const WAVE_TO_VERIFY: Prisma.OrderWhereInput = {
  paymentMethod: PaymentMethod.WAVE,
  paymentStatus: PaymentStatus.NON_PAYE,
  status: { not: OrderStatus.ANNULEE },
};

export function parseOrderListParams(searchParams: Record<string, string | string[] | undefined>): OrderListParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const tab = one('statut') as OrderTab | undefined;
  const page = Number(one('page'));
  return {
    tab: tab && ORDER_TABS.includes(tab) ? tab : 'toutes',
    q: one('q')?.slice(0, 80),
    waveToVerify: one('paiement') === 'wave-a-verifier',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Numéro (« 41 » trouve CMD-2026-00041), nom sans accents, ou téléphone (chiffres). */
async function searchOrderIds(q: string): Promise<string[]> {
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const digits = q.replace(/\D/g, '');
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM orders
     WHERE order_number ILIKE ${`%${escaped}%`}
        OR normalize_search(customer_name) LIKE '%' || normalize_search(${escaped}) || '%'
        OR (${digits.length >= 3} AND customer_phone LIKE ${`%${digits}%`})`;
  return rows.map((row) => row.id);
}

export const listAdminOrders = cache(async (params: OrderListParams) => {
  const searchIds = params.q ? await searchOrderIds(params.q) : null;

  // Filtres communs aux compteurs des onglets.
  const base: Prisma.OrderWhereInput = {
    AND: [searchIds ? { id: { in: searchIds } } : {}, params.waveToVerify ? WAVE_TO_VERIFY : {}],
  };
  const where: Prisma.OrderWhereInput =
    params.tab === 'toutes' ? base : { AND: [base, { status: TAB_STATUS[params.tab] }] };

  const [orders, groups, waveCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: QUEUE_TABS.includes(params.tab) ? 'asc' : 'desc' },
      skip: (params.page - 1) * ORDERS_PER_PAGE,
      take: ORDERS_PER_PAGE,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        customerName: true,
        customerPhone: true,
        city: true,
        zoneName: true,
        total: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        items: { orderBy: { id: 'asc' }, take: 3, select: { productName: true, variantLabel: true, quantity: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
    // Compteur du filtre « Wave à vérifier », hors filtre lui-même.
    prisma.order.count({ where: { AND: [searchIds ? { id: { in: searchIds } } : {}, WAVE_TO_VERIFY] } }),
  ]);

  const byStatus = (status: OrderStatus) => groups.find((g) => g.status === status)?._count._all ?? 0;
  const tabCounts: Record<OrderTab, number> = {
    toutes: groups.reduce((total, g) => total + g._count._all, 0),
    'a-confirmer': byStatus(OrderStatus.EN_ATTENTE),
    'a-expedier': byStatus(OrderStatus.CONFIRMEE),
    'en-livraison': byStatus(OrderStatus.EN_LIVRAISON),
    livrees: byStatus(OrderStatus.LIVREE),
    annulees: byStatus(OrderStatus.ANNULEE),
  };
  const total = tabCounts[params.tab];

  return {
    orders,
    tabCounts,
    waveCount,
    total,
    pageCount: Math.max(1, Math.ceil(total / ORDERS_PER_PAGE)),
  };
});

export type AdminOrderRow = Awaited<ReturnType<typeof listAdminOrders>>['orders'][number];

// -----------------------------------------------------------------------------
//  Détail
// -----------------------------------------------------------------------------

/** Commande complète (null si introuvable), partagée par generateMetadata et la page. */
export const getOrderDetail = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      paymentReference: true,
      paidAt: true,
      refundedAt: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      zoneName: true,
      region: true,
      city: true,
      address: true,
      landmark: true,
      customerNote: true,
      defaultDeliveryFee: true,
      deliveryFee: true,
      deliveryFeeNote: true,
      subtotal: true,
      discountTotal: true,
      total: true,
      confirmedAt: true,
      shippedAt: true,
      deliveredAt: true,
      cancelledAt: true,
      cancelReason: true,
      createdAt: true,
      paymentConfirmedBy: { select: { fullName: true } },
      customer: { select: { id: true, _count: { select: { orders: true } } } },
      items: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          productId: true,
          productName: true,
          variantLabel: true,
          unitPrice: true,
          unitDiscount: true,
          promotionName: true,
          quantity: true,
          lineTotal: true,
          product: {
            select: { slug: true, images: { orderBy: { position: 'asc' }, take: 1, select: { storagePath: true } } },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, fromStatus: true, toStatus: true, note: true, createdAt: true, admin: { select: { fullName: true } } },
      },
    },
  });
});

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
