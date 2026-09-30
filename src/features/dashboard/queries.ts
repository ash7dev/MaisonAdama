import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ADMIN_COUNTS_TAG, getAdminCounts } from '@/features/admin/queries';
import { getCustomerOverview } from '@/features/customers/queries';
import { dayKey, resolvePeriod, startOfDay, type DashboardPeriod, type DashboardPeriodKey } from './period';

/**
 * Données du tableau de bord : 100 % serveur, agrégées en SQL.
 *
 * DÉFINITIONS (une seule source, reprise partout) :
 * - Commande comptée   : toute commande non annulée.
 * - Chiffre d'affaires : somme des `total` (ce que paient les clients, remises
 *                        déduites, livraison incluse) des commandes non annulées
 *                        et non remboursées, par date de COMMANDE.
 * - Encaissé           : part du CA déjà payée (payment_status = PAYE).
 * - En attente         : part du CA non encore payée (Wave à vérifier ou
 *                        paiement à la livraison).
 * - Panier moyen       : CA / nombre de commandes comptées.
 * - Taux de confirmation : commandes confirmées / commandes tranchées
 *                        (sorties de « à confirmer » : confirmées ou annulées).
 * - Nouveau client     : sa première commande comptée tombe dans la période.
 *
 * Heure de Dakar partout (UTC+0) : regroupements « AT TIME ZONE 'Africa/Dakar' ».
 */

export const DASHBOARD_TAG = 'dashboard';

/** Commandes qui comptent dans le chiffre d'affaires. */
const REVENUE = Prisma.sql`o.status <> 'ANNULEE' AND o.payment_status <> 'REMBOURSE'`;
const COUNTED = Prisma.sql`o.status <> 'ANNULEE'`;
const DAKAR = Prisma.sql`'Africa/Dakar'`;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

// -----------------------------------------------------------------------------
//  Chiffre d'affaires : totaux, comparaison, série, aujourd'hui
// -----------------------------------------------------------------------------

async function revenueOverview(p: DashboardPeriod, todayStart: Date) {
  const [[t], series] = await Promise.all([
    prisma.$queryRaw<
      [{
        revenue: number; paid: number; pending: number; discounts: number; delivery: number; orders: number;
        prev_revenue: number; prev_orders: number;
        today_revenue: number; today_pending: number; today_orders: number;
      }]
    >`
      SELECT
        coalesce(sum(o.total)          FILTER (WHERE cur), 0)::float8                                   AS revenue,
        coalesce(sum(o.total)          FILTER (WHERE cur AND o.payment_status = 'PAYE'), 0)::float8     AS paid,
        coalesce(sum(o.total)          FILTER (WHERE cur AND o.payment_status = 'NON_PAYE'), 0)::float8 AS pending,
        coalesce(sum(o.discount_total) FILTER (WHERE cur), 0)::float8                                   AS discounts,
        coalesce(sum(o.delivery_fee)   FILTER (WHERE cur), 0)::float8                                   AS delivery,
        count(*)                       FILTER (WHERE cur)::int                                          AS orders,
        coalesce(sum(o.total)          FILTER (WHERE prev), 0)::float8                                  AS prev_revenue,
        count(*)                       FILTER (WHERE prev)::int                                         AS prev_orders,
        coalesce(sum(o.total)          FILTER (WHERE today), 0)::float8                                 AS today_revenue,
        coalesce(sum(o.total)          FILTER (WHERE today AND o.payment_status = 'NON_PAYE'), 0)::float8 AS today_pending,
        count(*)                       FILTER (WHERE today)::int                                        AS today_orders
      FROM (
        SELECT o.*,
               o.created_at >= ${p.start}     AND o.created_at < ${p.end}     AS cur,
               o.created_at >= ${p.prevStart} AND o.created_at < ${p.prevEnd} AS prev,
               o.created_at >= ${todayStart}                                  AS today
          FROM orders o
         WHERE ${REVENUE} AND o.created_at >= least(${p.prevStart}::timestamptz, ${todayStart}::timestamptz)
      ) o`,
    prisma.$queryRaw<{ k: string; paid: number; pending: number; orders: number }[]>`
      SELECT to_char(date_trunc(${p.bucket}, o.created_at AT TIME ZONE ${DAKAR}), ${p.bucket === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM'}) AS k,
             coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'PAYE'), 0)::float8     AS paid,
             coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'NON_PAYE'), 0)::float8 AS pending,
             count(*)::int AS orders
        FROM orders o
       WHERE ${REVENUE} AND o.created_at >= ${p.start} AND o.created_at < ${p.end}
       GROUP BY 1`,
  ]);

  const byKey = new Map(series.map((s) => [s.k, s]));
  const elapsed = p.buckets.filter((b) => !b.isFuture).length;
  return {
    revenue: t.revenue,
    paid: t.paid,
    pending: t.pending,
    discounts: t.discounts,
    delivery: t.delivery,
    orders: t.orders,
    prevRevenue: t.prev_revenue,
    /** Variation en % (null si pas de référence : période précédente à 0). */
    change: t.prev_revenue > 0 ? (t.revenue - t.prev_revenue) / t.prev_revenue : null,
    /** Moyenne par jour (ou par mois) écoulé, ligne pointillée du graphique. */
    averagePerBucket: elapsed ? t.revenue / elapsed : 0,
    today: { revenue: t.today_revenue, pending: t.today_pending, orders: t.today_orders },
    series: p.buckets.map((b) => {
      const s = byKey.get(b.key);
      return { ...b, paid: s?.paid ?? 0, pending: s?.pending ?? 0, orders: s?.orders ?? 0 };
    }),
  };
}

// -----------------------------------------------------------------------------
//  Indicateurs (période vs précédente) + mini-séries des 10 derniers jours
// -----------------------------------------------------------------------------

async function kpis(p: DashboardPeriod, todayStart: Date) {
  const since10 = new Date(todayStart.getTime() - 9 * 86_400_000);
  const [[k], daily] = await Promise.all([
    prisma.$queryRaw<
      [{
        orders: number; prev_orders: number; cancelled: number;
        confirmed: number; decided: number; prev_confirmed: number; prev_decided: number;
        revenue: number; prev_revenue: number; revenue_orders: number; prev_revenue_orders: number;
        items: number; new_customers: number; prev_new_customers: number;
      }]
    >`
      WITH scoped AS (
        SELECT o.*,
               o.created_at >= ${p.start}     AND o.created_at < ${p.end}     AS cur,
               o.created_at >= ${p.prevStart} AND o.created_at < ${p.prevEnd} AS prev
          FROM orders o
         WHERE o.created_at >= ${p.prevStart}
      ),
      firsts AS (
        SELECT min(o.created_at) AS first_at FROM orders o WHERE ${COUNTED} GROUP BY o.customer_id
      )
      SELECT
        count(*) FILTER (WHERE cur  AND status <> 'ANNULEE')::int                                       AS orders,
        count(*) FILTER (WHERE prev AND status <> 'ANNULEE')::int                                       AS prev_orders,
        count(*) FILTER (WHERE cur  AND status = 'ANNULEE')::int                                        AS cancelled,
        count(*) FILTER (WHERE cur  AND confirmed_at IS NOT NULL)::int                                  AS confirmed,
        count(*) FILTER (WHERE cur  AND status <> 'EN_ATTENTE')::int                                    AS decided,
        count(*) FILTER (WHERE prev AND confirmed_at IS NOT NULL)::int                                  AS prev_confirmed,
        count(*) FILTER (WHERE prev AND status <> 'EN_ATTENTE')::int                                    AS prev_decided,
        coalesce(sum(total) FILTER (WHERE cur  AND status <> 'ANNULEE' AND payment_status <> 'REMBOURSE'), 0)::float8 AS revenue,
        coalesce(sum(total) FILTER (WHERE prev AND status <> 'ANNULEE' AND payment_status <> 'REMBOURSE'), 0)::float8 AS prev_revenue,
        count(*) FILTER (WHERE cur  AND status <> 'ANNULEE' AND payment_status <> 'REMBOURSE')::int     AS revenue_orders,
        count(*) FILTER (WHERE prev AND status <> 'ANNULEE' AND payment_status <> 'REMBOURSE')::int     AS prev_revenue_orders,
        (SELECT coalesce(sum(i.quantity), 0)::int FROM order_items i JOIN scoped s ON s.id = i.order_id
          WHERE s.cur AND s.status <> 'ANNULEE')                                                         AS items,
        (SELECT count(*)::int FROM firsts WHERE first_at >= ${p.start}     AND first_at < ${p.end})     AS new_customers,
        (SELECT count(*)::int FROM firsts WHERE first_at >= ${p.prevStart} AND first_at < ${p.prevEnd}) AS prev_new_customers
      FROM scoped`,
    prisma.$queryRaw<{ k: string; orders: number; revenue: number; confirmed: number; decided: number; new_customers: number }[]>`
      WITH days AS (
        SELECT generate_series(${since10}::timestamptz, ${todayStart}::timestamptz, interval '1 day') AS d
      ),
      firsts AS (
        SELECT min(o.created_at) AS first_at FROM orders o WHERE ${COUNTED} GROUP BY o.customer_id
      )
      SELECT to_char(d AT TIME ZONE ${DAKAR}, 'YYYY-MM-DD') AS k,
             (SELECT count(*) FROM orders o WHERE ${COUNTED} AND o.created_at >= d AND o.created_at < d + interval '1 day')::int AS orders,
             (SELECT coalesce(sum(o.total), 0) FROM orders o WHERE ${REVENUE} AND o.created_at >= d AND o.created_at < d + interval '1 day')::float8 AS revenue,
             (SELECT count(*) FROM orders o WHERE o.confirmed_at IS NOT NULL AND o.created_at >= d AND o.created_at < d + interval '1 day')::int AS confirmed,
             (SELECT count(*) FROM orders o WHERE o.status <> 'EN_ATTENTE' AND o.created_at >= d AND o.created_at < d + interval '1 day')::int AS decided,
             (SELECT count(*) FROM firsts WHERE first_at >= d AND first_at < d + interval '1 day')::int AS new_customers
        FROM days
       ORDER BY d`,
  ]);

  const rate = (a: number, b: number) => (b > 0 ? a / b : null);
  const avg = (sum: number, n: number) => (n > 0 ? sum / n : null);
  const basket = avg(k.revenue, k.revenue_orders);
  const prevBasket = avg(k.prev_revenue, k.prev_revenue_orders);
  const confirmation = rate(k.confirmed, k.decided);
  const prevConfirmation = rate(k.prev_confirmed, k.prev_decided);

  return {
    orders: { value: k.orders, delta: k.orders - k.prev_orders, cancelled: k.cancelled, confirmed: k.confirmed },
    basket: {
      value: basket,
      change: basket !== null && prevBasket ? (basket - prevBasket) / prevBasket : null,
      itemsPerOrder: k.orders ? k.items / k.orders : null,
    },
    confirmation: {
      value: confirmation,
      /** En points de pourcentage. */
      deltaPoints: confirmation !== null && prevConfirmation !== null ? (confirmation - prevConfirmation) * 100 : null,
    },
    newCustomers: { value: k.new_customers, delta: k.new_customers - k.prev_new_customers },
    /** 10 derniers jours, du plus ancien à aujourd'hui (mini-barres, semaine mobile). */
    daily: daily.map((d) => ({
      key: d.k,
      orders: d.orders,
      revenue: d.revenue,
      basket: d.orders ? d.revenue / d.orders : 0,
      confirmation: d.decided ? d.confirmed / d.decided : 0,
      newCustomers: d.new_customers,
    })),
  };
}

// -----------------------------------------------------------------------------
//  Fil « Aujourd'hui » : commandes, changements de statut, paiements
// -----------------------------------------------------------------------------

type FeedRow = {
  at: Date; kind: 'order' | 'status' | 'paid'; order_id: string; order_number: string; customer_name: string;
  city: string; total: number; payment_method: 'WAVE' | 'A_LA_LIVRAISON'; to_status: string | null; admin_name: string | null;
};

export type FeedTone = 'order' | 'wave' | 'progress' | 'success' | 'danger';

const short = (n: string) => n.replace(/^CMD-\d{4}-/, 'CMD-');
const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

async function todayFeed(todayStart: Date) {
  const rows = await prisma.$queryRaw<FeedRow[]>`
    SELECT * FROM (
      SELECT o.created_at AS at, 'order' AS kind, o.id AS order_id, o.order_number, o.customer_name, o.city, o.total,
             o.payment_method::text AS payment_method, NULL::text AS to_status, NULL::text AS admin_name
        FROM orders o WHERE o.created_at >= ${todayStart}
      UNION ALL
      SELECT h.created_at, 'status', o.id, o.order_number, o.customer_name, o.city, o.total,
             o.payment_method::text, h.to_status::text, a.full_name
        FROM order_status_history h
        JOIN orders o ON o.id = h.order_id
        LEFT JOIN admin_profiles a ON a.id = h.admin_id
       WHERE h.created_at >= ${todayStart} AND h.from_status IS NOT NULL
      UNION ALL
      SELECT o.paid_at, 'paid', o.id, o.order_number, o.customer_name, o.city, o.total,
             o.payment_method::text, NULL, NULL
        FROM orders o WHERE o.paid_at >= ${todayStart}
    ) e
    ORDER BY at DESC
    LIMIT 8`;

  return rows.map((r) => {
    const by = r.admin_name ? ` · par ${r.admin_name.split(' ')[0]}` : '';
    let tone: FeedTone = 'progress';
    let title: string;
    let detail: string;
    if (r.kind === 'order') {
      tone = 'order';
      title = `Nouvelle commande · ${fcfa(r.total)}`;
      detail = `${r.customer_name} · ${r.city} · ${r.payment_method === 'WAVE' ? 'Wave' : 'à la livraison'}`;
    } else if (r.kind === 'paid') {
      tone = r.payment_method === 'WAVE' ? 'wave' : 'success';
      title = r.payment_method === 'WAVE' ? 'Paiement Wave confirmé' : 'Encaissé à la livraison';
      detail = `${short(r.order_number)} · ${r.customer_name} · ${fcfa(r.total)}`;
    } else {
      const map: Record<string, [string, FeedTone]> = {
        CONFIRMEE: ['Commande confirmée', 'progress'],
        EN_LIVRAISON: ['Remise au livreur', 'progress'],
        LIVREE: [`Livrée · ${r.customer_name}`, 'success'],
        ANNULEE: ['Commande annulée', 'danger'],
      };
      const [t, tn] = map[r.to_status ?? ''] ?? ['Statut mis à jour', 'progress'];
      title = t;
      tone = tn;
      detail = r.to_status === 'LIVREE' ? `${r.city} · ${short(r.order_number)}${by}` : `${short(r.order_number)} · ${r.customer_name}${by}`;
    }
    return { at: r.at.toISOString(), orderId: r.order_id, tone, title, detail };
  });
}

// -----------------------------------------------------------------------------
//  Répartitions : univers, meilleures ventes, zones, heures
// -----------------------------------------------------------------------------

async function salesByCategory(p: DashboardPeriod) {
  const rows = await prisma.$queryRaw<{ name: string; amount: number; quantity: number }[]>`
    SELECT c.name, sum(i.line_total)::float8 AS amount, sum(i.quantity)::int AS quantity
      FROM order_items i
      JOIN orders o     ON o.id = i.order_id
      JOIN products pr  ON pr.id = i.product_id
      JOIN categories c ON c.id = pr.category_id
     WHERE ${REVENUE} AND o.created_at >= ${p.start} AND o.created_at < ${p.end}
     GROUP BY c.name
     ORDER BY amount DESC`;
  const total = rows.reduce((s, r) => s + r.amount, 0);
  // 4 univers + « Autres » pour garder l'anneau lisible.
  const top = rows.slice(0, 4);
  const rest = rows.slice(4);
  const slices = rest.length ? [...top, { name: 'Autres', amount: rest.reduce((s, r) => s + r.amount, 0), quantity: rest.reduce((s, r) => s + r.quantity, 0) }] : top;
  return { total, slices: slices.map((s) => ({ ...s, share: total ? s.amount / total : 0 })) };
}

async function bestSellers(p: DashboardPeriod) {
  const rows = await prisma.$queryRaw<{ product_id: string; name: string; quantity: number; amount: number; storage_path: string | null }[]>`
    SELECT i.product_id, pr.name, sum(i.quantity)::int AS quantity, sum(i.line_total)::float8 AS amount,
           (SELECT storage_path FROM product_images pi WHERE pi.product_id = i.product_id ORDER BY position LIMIT 1) AS storage_path
      FROM order_items i
      JOIN orders o    ON o.id = i.order_id
      JOIN products pr ON pr.id = i.product_id
     WHERE ${REVENUE} AND o.created_at >= ${p.start} AND o.created_at < ${p.end}
     GROUP BY i.product_id, pr.name
     ORDER BY quantity DESC, amount DESC
     LIMIT 5`;
  return rows.map((r) => ({ productId: r.product_id, name: r.name, quantity: r.quantity, amount: r.amount, storagePath: r.storage_path }));
}

async function zoneStats(p: DashboardPeriod) {
  const [zones, [delivery]] = await Promise.all([
    prisma.$queryRaw<{ name: string; orders: number }[]>`
      SELECT o.zone_name AS name, count(*)::int AS orders
        FROM orders o
       WHERE ${COUNTED} AND o.created_at >= ${p.start} AND o.created_at < ${p.end}
       GROUP BY o.zone_name
       ORDER BY orders DESC`,
    prisma.$queryRaw<[{ delivered: number; avg_hours: number | null; cancelled_after_ship: number }]>`
      SELECT count(*) FILTER (WHERE o.delivered_at IS NOT NULL)::int AS delivered,
             (avg(extract(epoch FROM o.delivered_at - o.created_at)) FILTER (WHERE o.delivered_at IS NOT NULL) / 3600)::float8 AS avg_hours,
             count(*) FILTER (WHERE o.status = 'ANNULEE' AND o.shipped_at IS NOT NULL)::int AS cancelled_after_ship
        FROM orders o
       WHERE o.created_at >= ${p.start} AND o.created_at < ${p.end}`,
  ]);
  const total = zones.reduce((s, z) => s + z.orders, 0);
  const shipped = delivery.delivered + delivery.cancelled_after_ship;
  return {
    zones: zones.map((z) => ({ ...z, share: total ? z.orders / total : 0 })),
    delivered: delivery.delivered,
    averageDeliveryHours: delivery.avg_hours,
    /** Livrées / (livrées + annulées après expédition) : colis refusés ou perdus. */
    deliverySuccess: shipped ? delivery.delivered / shipped : null,
  };
}

/**
 * Quand les clients commandent : 90 derniers jours, jour de la semaine × tranche
 * de 3 heures (heure de Dakar). Niveaux 0–4 relatifs au maximum.
 */
async function orderHeatmap(todayStart: Date) {
  const since = new Date(todayStart.getTime() - 89 * 86_400_000);
  const rows = await prisma.$queryRaw<{ dow: number; slot: number; n: number }[]>`
    SELECT extract(isodow FROM o.created_at AT TIME ZONE ${DAKAR})::int AS dow,
           (extract(hour FROM o.created_at AT TIME ZONE ${DAKAR})::int / 3)  AS slot,
           count(*)::int AS n
      FROM orders o
     WHERE ${COUNTED} AND o.created_at >= ${since}
     GROUP BY 1, 2`;
  const grid = Array.from({ length: 7 }, () => Array<number>(8).fill(0));
  for (const r of rows) grid[r.dow - 1][r.slot] = r.n;
  const max = Math.max(0, ...grid.flat());
  const total = grid.flat().reduce((s, n) => s + n, 0);
  let peak: { day: number; slot: number } | null = null;
  grid.forEach((row, d) => row.forEach((n, s) => { if (n === max && max > 0 && !peak) peak = { day: d, slot: s }; }));
  return {
    total,
    grid: grid.map((row) => row.map((n) => ({ count: n, level: n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * 4)) }))),
    /** Assez de commandes pour dégager une tendance ? */
    reliable: total >= 20,
    peak: peak as { day: number; slot: number } | null,
  };
}

// -----------------------------------------------------------------------------
//  Promotion en cours
// -----------------------------------------------------------------------------

async function activePromotion(now: Date) {
  const promo = await prisma.promotion.findFirst({
    where: { code: null, isActive: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { endsAt: 'asc' },
    select: {
      id: true, name: true, type: true, value: true, startsAt: true, endsAt: true,
      targets: { select: { productId: true, variantId: true } },
    },
  });
  if (!promo) return null;
  const [[usage], [others]] = await Promise.all([
    prisma.$queryRaw<[{ orders: number; discount: number }]>`
      SELECT count(DISTINCT i.order_id)::int AS orders, coalesce(sum(i.unit_discount * i.quantity), 0)::float8 AS discount
        FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE i.promotion_id = ${promo.id}::uuid AND ${COUNTED}`,
    prisma.$queryRaw<[{ n: number }]>`
      SELECT count(*)::int AS n FROM promotions
       WHERE code IS NULL AND is_active AND starts_at <= ${now} AND ends_at > ${now} AND id <> ${promo.id}::uuid`,
  ]);
  const duration = promo.endsAt.getTime() - promo.startsAt.getTime();
  return {
    id: promo.id,
    name: promo.name,
    type: promo.type,
    value: promo.value,
    endsAt: promo.endsAt.toISOString(),
    progress: duration > 0 ? Math.min(1, (now.getTime() - promo.startsAt.getTime()) / duration) : 1,
    products: promo.targets.filter((t) => t.productId).length,
    variants: promo.targets.filter((t) => t.variantId).length,
    orders: usage.orders,
    discount: usage.discount,
    otherActive: others.n,
  };
}

// -----------------------------------------------------------------------------
//  Commandes récentes, stock bas, file d'actions (mobile)
// -----------------------------------------------------------------------------

async function recentOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      id: true, orderNumber: true, createdAt: true, customerName: true, city: true, zoneName: true, total: true,
      status: true, paymentMethod: true, paymentStatus: true, paidAt: true,
    },
  });
  return orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), paidAt: iso(o.paidAt) }));
}

/**
 * Stock bas, avec l'autonomie estimée : stock / ventes moyennes par jour sur
 * 30 jours (null si rien vendu : pas d'estimation possible).
 */
async function lowStock() {
  const rows = await prisma.$queryRaw<{ variant_id: string; product_id: string; name: string; label: string; stock: number; sold30: number; storage_path: string | null }[]>`
    SELECT v.id AS variant_id, p.id AS product_id, p.name, v.label, v.stock,
           coalesce((SELECT sum(i.quantity) FROM order_items i JOIN orders o ON o.id = i.order_id
                      WHERE i.variant_id = v.id AND ${COUNTED} AND o.created_at >= now() - interval '30 days'), 0)::int AS sold30,
           (SELECT storage_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY position LIMIT 1) AS storage_path
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
     WHERE v.is_active AND NOT p.is_archived AND v.stock <= v.low_stock_threshold
     ORDER BY v.stock ASC, p.name
     LIMIT 5`;
  return rows.map((r) => ({
    variantId: r.variant_id,
    productId: r.product_id,
    name: r.name,
    label: r.label,
    stock: r.stock,
    daysLeft: r.sold30 > 0 ? Math.floor(r.stock / (r.sold30 / 30)) : null,
    storagePath: r.storage_path,
  }));
}

const queueOrderSelect = {
  id: true, orderNumber: true, createdAt: true, confirmedAt: true, shippedAt: true, updatedAt: true,
  customerName: true, customerPhone: true, city: true, total: true, deliveryFee: true,
  status: true, paymentMethod: true, paymentStatus: true, paymentReference: true,
  items: {
    orderBy: { id: 'asc' as const },
    take: 1,
    select: {
      productName: true, variantLabel: true, quantity: true,
      product: { select: { images: { orderBy: { position: 'asc' as const }, take: 1, select: { storagePath: true } } } },
    },
  },
  _count: { select: { items: true } },
  customer: { select: { id: true, _count: { select: { orders: true } } } },
} satisfies Prisma.OrderSelect;

type QueueOrder = Prisma.OrderGetPayload<{ select: typeof queueOrderSelect }>;

/**
 * « Prochaine action » : tout ce qui attend une intervention, dans l'ordre où il
 * faut le traiter — confirmer (le plus ancien d'abord), vérifier Wave, expédier,
 * clôturer les livraisons, réassortir.
 */
async function actionQueue(stock: Awaited<ReturnType<typeof lowStock>>) {
  const [toConfirm, toVerify, toShip, inDelivery] = await Promise.all([
    prisma.order.findMany({ where: { status: 'EN_ATTENTE' }, orderBy: { createdAt: 'asc' }, take: 10, select: queueOrderSelect }),
    prisma.order.findMany({
      where: { paymentMethod: 'WAVE', paymentStatus: 'NON_PAYE', status: { in: ['CONFIRMEE', 'EN_LIVRAISON', 'LIVREE'] } },
      orderBy: { createdAt: 'asc' },
      take: 5,
      select: queueOrderSelect,
    }),
    prisma.order.findMany({ where: { status: 'CONFIRMEE' }, orderBy: { confirmedAt: 'asc' }, take: 5, select: queueOrderSelect }),
    prisma.order.findMany({ where: { status: 'EN_LIVRAISON' }, orderBy: { shippedAt: 'asc' }, take: 5, select: queueOrderSelect }),
  ]);

  const toItem = (kind: 'confirm' | 'verify' | 'ship' | 'deliver', o: QueueOrder) => ({
    kind,
    key: `${kind}-${o.id}`,
    orderId: o.id,
    orderNumber: o.orderNumber,
    /** Point de départ de l'attente, selon l'étape. */
    since: ((kind === 'ship' ? o.confirmedAt : kind === 'deliver' ? o.shippedAt : null) ?? o.createdAt).toISOString(),
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerId: o.customer.id,
    customerOrders: o.customer._count.orders,
    city: o.city,
    total: o.total,
    deliveryFee: o.deliveryFee,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    paymentReference: o.paymentReference,
    firstItem: o.items[0]
      ? { name: o.items[0].productName, label: o.items[0].variantLabel, quantity: o.items[0].quantity, storagePath: o.items[0].product.images[0]?.storagePath ?? null }
      : null,
    otherItems: Math.max(0, o._count.items - 1),
  });

  // Une commande Wave confirmée à vérifier ET à expédier n'apparaît qu'une fois (vérifier d'abord).
  const verifyIds = new Set(toVerify.map((o) => o.id));
  const orders = [
    ...toConfirm.map((o) => toItem('confirm', o)),
    ...toVerify.map((o) => toItem('verify', o)),
    ...toShip.filter((o) => !verifyIds.has(o.id)).map((o) => toItem('ship', o)),
    ...inDelivery.filter((o) => !verifyIds.has(o.id)).map((o) => toItem('deliver', o)),
  ];
  const restock = stock.slice(0, 3).map((s) => ({ kind: 'restock' as const, key: `restock-${s.variantId}`, ...s }));
  return [...orders, ...restock];
}

// -----------------------------------------------------------------------------
//  Assemblage (mis en cache 30 s, invalidé par toute action sur les commandes)
// -----------------------------------------------------------------------------

async function buildDashboard(periodKey: DashboardPeriodKey) {
  const now = new Date();
  const period = resolvePeriod(periodKey, now);
  const todayStart = startOfDay(now);

  const stock = await lowStock();
  const [revenue, indicators, feed, categories, best, zones, heatmap, promotion, recent, queue, counts, customers] = await Promise.all([
    revenueOverview(period, todayStart),
    kpis(period, todayStart),
    todayFeed(todayStart),
    salesByCategory(period),
    bestSellers(period),
    zoneStats(period),
    orderHeatmap(todayStart),
    activePromotion(now),
    recentOrders(),
    actionQueue(stock),
    getAdminCounts(),
    getCustomerOverview(),
  ]);

  return {
    generatedAt: now.toISOString(),
    today: dayKey(todayStart),
    period: {
      key: period.key,
      label: period.label,
      compareLabel: period.compareLabel,
      bucket: period.bucket,
    },
    revenue,
    kpis: indicators,
    /** Clients qui ont commandé au moins deux fois, parmi les acheteurs. */
    repeatRate: customers.repeatRate,
    feed,
    categories,
    best,
    zones,
    heatmap,
    promotion,
    recent,
    lowStock: stock,
    lowStockCount: counts.lowStock,
    queue,
    counts,
  };
}

export type DashboardData = Awaited<ReturnType<typeof buildDashboard>>;

export const getDashboard = cache((periodKey: DashboardPeriodKey) =>
  unstable_cache(() => buildDashboard(periodKey), ['admin-dashboard', periodKey], {
    revalidate: 30,
    tags: [DASHBOARD_TAG, ADMIN_COUNTS_TAG],
  })(),
);
