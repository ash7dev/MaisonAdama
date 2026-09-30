import { cache } from 'react';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// -----------------------------------------------------------------------------
//  Définitions (une seule source pour la liste, les onglets et la fiche)
// -----------------------------------------------------------------------------
//  - Commandes     : commandes non annulées.
//  - Total dépensé : commandes livrées et non remboursées (argent réellement encaissé).
//  - Fidèle        : au moins 2 commandes.
//  - Nouveau       : première commande il y a moins de 30 jours.
//  - À relancer    : dernière commande il y a plus de 60 jours.
// -----------------------------------------------------------------------------

export const NEW_CUSTOMER_DAYS = 30;
export const DORMANT_DAYS = 60;
export const LOYAL_MIN_ORDERS = 2;

export const CUSTOMER_SEGMENTS = ['tous', 'fideles', 'nouveaux', 'a-relancer'] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const CUSTOMER_SORTS = ['recents', 'depense', 'commandes', 'nom'] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export const CUSTOMERS_PER_PAGE = 25;

export type CustomerListParams = { segment: CustomerSegment; q?: string; sort: CustomerSort; page: number };

export function parseCustomerListParams(searchParams: Record<string, string | string[] | undefined>): CustomerListParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const segment = one('segment') as CustomerSegment | undefined;
  const sort = one('tri') as CustomerSort | undefined;
  const page = Number(one('page'));
  return {
    segment: segment && CUSTOMER_SEGMENTS.includes(segment) ? segment : 'tous',
    q: one('q')?.slice(0, 80),
    sort: sort && CUSTOMER_SORTS.includes(sort) ? sort : 'recents',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

const ORDER_BY: Record<CustomerSort, Prisma.Sql> = {
  recents: Prisma.sql`last_order_at DESC NULLS LAST, created_at DESC`,
  depense: Prisma.sql`spent DESC, orders_count DESC, last_order_at DESC NULLS LAST`,
  commandes: Prisma.sql`orders_count DESC, spent DESC, last_order_at DESC NULLS LAST`,
  nom: Prisma.sql`normalize_search(name) ASC`,
};

const SEGMENT_WHERE: Record<CustomerSegment, Prisma.Sql> = {
  tous: Prisma.sql`TRUE`,
  fideles: Prisma.sql`is_loyal`,
  nouveaux: Prisma.sql`is_new`,
  'a-relancer': Prisma.sql`is_dormant`,
};

/** Statistiques par client, filtrées par la recherche (nom sans accents ou chiffres du téléphone). */
function statsCte(q?: string): Prisma.Sql {
  let search = Prisma.sql`TRUE`;
  if (q) {
    const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
    const digits = q.replace(/\D/g, '');
    search = Prisma.sql`(normalize_search(c.name) LIKE '%' || normalize_search(${escaped}) || '%'
                         OR (${digits.length >= 3} AND c.phone LIKE ${`%${digits}%`}))`;
  }
  return Prisma.sql`
    stats AS (
      SELECT c.id, c.name, c.phone, c.created_at,
             coalesce(btrim(c.admin_note), '') <> ''                                                  AS has_note,
             count(o.id) FILTER (WHERE o.status <> 'ANNULEE')::int                                     AS orders_count,
             count(o.id) FILTER (WHERE o.status IN ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON'))::int  AS open_count,
             coalesce(sum(o.total) FILTER (WHERE o.status = 'LIVREE' AND o.payment_status <> 'REMBOURSE'), 0)::int AS spent,
             max(o.created_at) FILTER (WHERE o.status <> 'ANNULEE')                                    AS last_order_at,
             min(o.created_at) FILTER (WHERE o.status <> 'ANNULEE')                                    AS first_order_at
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
       WHERE ${search}
       GROUP BY c.id
    ),
    tagged AS (
      SELECT *,
             orders_count >= ${LOYAL_MIN_ORDERS}::int                                                        AS is_loyal,
             first_order_at >= now() - make_interval(days => ${NEW_CUSTOMER_DAYS}::int)                        AS is_new,
             coalesce(last_order_at < now() - make_interval(days => ${DORMANT_DAYS}::int), false)               AS is_dormant
        FROM stats
    )`;
}

type CustomerRowRaw = {
  id: string;
  name: string;
  phone: string;
  created_at: Date;
  has_note: boolean;
  orders_count: number;
  open_count: number;
  spent: number;
  last_order_at: Date | null;
  first_order_at: Date | null;
  is_loyal: boolean;
  is_new: boolean | null;
  is_dormant: boolean;
  last_city: string | null;
};

export type AdminCustomerRow = {
  id: string;
  name: string;
  phone: string;
  createdAt: Date;
  hasNote: boolean;
  ordersCount: number;
  openCount: number;
  spent: number;
  lastOrderAt: Date | null;
  lastCity: string | null;
  isLoyal: boolean;
  isNew: boolean;
  isDormant: boolean;
};

export const listAdminCustomers = cache(async (params: CustomerListParams) => {
  const cte = statsCte(params.q);
  const [rows, [counts]] = await Promise.all([
    prisma.$queryRaw<CustomerRowRaw[]>`
      WITH ${cte}
      SELECT t.*,
             (SELECT o.city FROM orders o WHERE o.customer_id = t.id ORDER BY o.created_at DESC LIMIT 1) AS last_city
        FROM tagged t
       WHERE ${SEGMENT_WHERE[params.segment]}
       ORDER BY ${ORDER_BY[params.sort]}
       LIMIT ${CUSTOMERS_PER_PAGE} OFFSET ${(params.page - 1) * CUSTOMERS_PER_PAGE}`,
    prisma.$queryRaw<[{ tous: number; fideles: number; nouveaux: number; a_relancer: number }]>`
      WITH ${cte}
      SELECT count(*)::int                               AS tous,
             count(*) FILTER (WHERE is_loyal)::int       AS fideles,
             count(*) FILTER (WHERE is_new)::int         AS nouveaux,
             count(*) FILTER (WHERE is_dormant)::int     AS a_relancer
        FROM tagged`,
  ]);

  const segmentCounts: Record<CustomerSegment, number> = {
    tous: counts.tous,
    fideles: counts.fideles,
    nouveaux: counts.nouveaux,
    'a-relancer': counts.a_relancer,
  };
  const total = segmentCounts[params.segment];

  const customers: AdminCustomerRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    createdAt: r.created_at,
    hasNote: r.has_note,
    ordersCount: r.orders_count,
    openCount: r.open_count,
    spent: r.spent,
    lastOrderAt: r.last_order_at,
    lastCity: r.last_city,
    isLoyal: r.is_loyal,
    isNew: Boolean(r.is_new),
    isDormant: r.is_dormant,
  }));

  return { customers, segmentCounts, total, pageCount: Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE)) };
});

/** Chiffres de l'en-tête : sur toute la clientèle, indépendamment des filtres. */
export const getCustomerOverview = cache(async () => {
  const [row] = await prisma.$queryRaw<[{ customers: number; buyers: number; repeat_buyers: number; new_this_month: number }]>`
    WITH per_customer AS (
      SELECT c.id, c.created_at, count(o.id) FILTER (WHERE o.status <> 'ANNULEE') AS n
        FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id
    )
    SELECT count(*)::int                                                          AS customers,
           count(*) FILTER (WHERE n >= 1)::int                                    AS buyers,
           count(*) FILTER (WHERE n >= ${LOYAL_MIN_ORDERS}::int)::int                  AS repeat_buyers,
           count(*) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'Africa/Dakar') AT TIME ZONE 'Africa/Dakar')::int AS new_this_month
      FROM per_customer`;
  return {
    customers: row.customers,
    newThisMonth: row.new_this_month,
    /** Part des acheteurs revenus au moins une fois (null tant qu'il n'y a pas d'acheteur). */
    repeatRate: row.buyers > 0 ? row.repeat_buyers / row.buyers : null,
  };
});

// -----------------------------------------------------------------------------
//  Fiche client
// -----------------------------------------------------------------------------

export const getCustomerDetail = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const [customer, favorites, addresses, aliases] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            deliveredAt: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            total: true,
            discountTotal: true,
            city: true,
            items: { orderBy: { id: 'asc' }, take: 3, select: { productName: true, variantLabel: true, quantity: true } },
            _count: { select: { items: true } },
          },
        },
      },
    }),
    // Produits préférés : quantités cumulées sur les commandes non annulées.
    prisma.$queryRaw<{ product_id: string; name: string; quantity: number; orders: number; storage_path: string | null; slug: string }[]>`
      SELECT i.product_id, p.name, p.slug, sum(i.quantity)::int AS quantity, count(DISTINCT i.order_id)::int AS orders,
             (SELECT storage_path FROM product_images pi WHERE pi.product_id = i.product_id ORDER BY position LIMIT 1) AS storage_path
        FROM order_items i
        JOIN orders o   ON o.id = i.order_id
        JOIN products p ON p.id = i.product_id
       WHERE o.customer_id = ${id}::uuid AND o.status <> 'ANNULEE'
       GROUP BY i.product_id, p.name, p.slug
       ORDER BY quantity DESC, orders DESC
       LIMIT 6`,
    // Adresses de livraison déjà utilisées, la plus récente d'abord.
    prisma.$queryRaw<{ region: string; city: string; address: string; landmark: string | null; zone_name: string; uses: number; last_used: Date }[]>`
      SELECT region, city, address, (array_agg(landmark ORDER BY created_at DESC))[1] AS landmark,
             (array_agg(zone_name ORDER BY created_at DESC))[1] AS zone_name,
             count(*)::int AS uses, max(created_at) AS last_used
        FROM orders
       WHERE customer_id = ${id}::uuid
       GROUP BY region, city, address
       ORDER BY last_used DESC
       LIMIT 5`,
    // Autres noms saisis avec ce numéro (commande pour un proche, surnom…).
    prisma.$queryRaw<{ name: string }[]>`
      SELECT DISTINCT customer_name AS name FROM orders
       WHERE customer_id = ${id}::uuid
         AND normalize_search(customer_name) <> (SELECT normalize_search(name) FROM customers WHERE id = ${id}::uuid)`,
  ]);
  if (!customer) return null;

  const active = customer.orders.filter((o) => o.status !== 'ANNULEE');
  const delivered = customer.orders.filter((o) => o.status === 'LIVREE' && o.paymentStatus !== 'REMBOURSE');
  const closed = customer.orders.filter((o) => o.status === 'LIVREE' || o.status === 'ANNULEE').length;
  const spent = delivered.reduce((sum, o) => sum + o.total, 0);
  const now = Date.now();
  const firstOrderAt = active.at(-1)?.createdAt ?? null;
  const lastOrderAt = active[0]?.createdAt ?? null;

  return {
    ...customer,
    updatedAt: customer.updatedAt.toISOString(),
    favorites,
    addresses,
    aliases: aliases.map((a) => a.name),
    stats: {
      ordersCount: active.length,
      cancelledCount: customer.orders.length - active.length,
      openCount: customer.orders.filter((o) => ['EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON'].includes(o.status)).length,
      openAmount: customer.orders
        .filter((o) => ['EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON'].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0),
      spent,
      averageBasket: delivered.length ? Math.round(spent / delivered.length) : null,
      savings: delivered.reduce((sum, o) => sum + o.discountTotal, 0),
      /** Livrées / (livrées + annulées) : fiabilité du client. */
      deliveryRate: closed ? customer.orders.filter((o) => o.status === 'LIVREE').length / closed : null,
      firstOrderAt,
      lastOrderAt,
      isLoyal: active.length >= LOYAL_MIN_ORDERS,
      isNew: firstOrderAt ? now - firstOrderAt.getTime() < NEW_CUSTOMER_DAYS * 86_400_000 : false,
      isDormant: lastOrderAt ? now - lastOrderAt.getTime() > DORMANT_DAYS * 86_400_000 : false,
    },
  };
});

export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomerDetail>>>;
