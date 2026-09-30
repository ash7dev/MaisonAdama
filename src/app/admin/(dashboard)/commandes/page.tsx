import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CircleCheck, Inbox, SearchX } from 'lucide-react';
import ListEmptyState from '@/components/admin/ListEmptyState';
import { requireAdmin } from '@/features/auth/require-admin';
import {
  listAdminOrders,
  ORDERS_PER_PAGE,
  parseOrderListParams,
  type OrderListParams,
  type OrderTab,
} from '@/features/orders/queries';
import OrderTabs from '@/features/orders/components/OrderTabs';
import OrdersToolbar from '@/features/orders/components/OrdersToolbar';
import OrderList from '@/features/orders/components/OrderList';
import Pagination from '@/features/catalog/components/list/Pagination';

export const metadata: Metadata = {
  title: 'Commandes · Administration Maison Adama',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function hrefFor(params: OrderListParams, changes: Partial<OrderListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.tab !== 'toutes') query.set('statut', next.tab);
  if (next.q) query.set('q', next.q);
  if (next.waveToVerify) query.set('paiement', 'wave-a-verifier');
  if (next.page > 1) query.set('page', String(next.page));
  return query.size ? `/admin/commandes?${query}` : '/admin/commandes';
}

const EMPTY_TAB: Record<OrderTab, { title: string; description: string; done?: boolean }> = {
  toutes: { title: 'Aucune commande', description: 'Les commandes de la boutique apparaîtront ici.' },
  'a-confirmer': { title: 'Tout est confirmé', description: 'Aucune nouvelle commande n’attend votre appel.', done: true },
  'a-expedier': { title: 'Rien à expédier', description: 'Les commandes confirmées à préparer apparaîtront ici.', done: true },
  'en-livraison': { title: 'Aucune livraison en cours', description: 'Les colis remis au livreur apparaîtront ici.' },
  livrees: { title: 'Aucune commande livrée', description: 'Les commandes remises aux clients apparaîtront ici.' },
  annulees: { title: 'Aucune commande annulée', description: 'Tant mieux.', done: true },
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseOrderListParams(await searchParams);
  const [, { orders, tabCounts, waveCount, total, pageCount }] = await Promise.all([requireAdmin(), listAdminOrders(params)]);

  if (params.page > pageCount) redirect(hrefFor(params, { page: pageCount }));

  const noOrdersAtAll = !params.q && !params.waveToVerify && tabCounts.toutes === 0;
  const toProcess = tabCounts['a-confirmer'] + tabCounts['a-expedier'];

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pb-8 lg:pt-3">
      <header className="flex flex-col gap-2 px-1 lg:min-h-[72px] lg:justify-center">
        <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">Commandes</h1>
        <p className="text-sm text-fumee">
          {toProcess > 0 ? (
            <>
              <span className="font-medium text-encre tabular-nums">{toProcess}</span> à traiter
              {waveCount > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-[#1F5673] tabular-nums">{waveCount}</span> paiement{waveCount > 1 ? 's' : ''} Wave à vérifier
                </>
              )}
            </>
          ) : (
            noOrdersAtAll ? 'En attente de la première commande.' : 'Tout est à jour.'
          )}
        </p>
      </header>

      <div className="flex flex-col gap-3.5">
        <OrderTabs current={params.tab} counts={tabCounts} buildHref={(tab) => hrefFor(params, { tab, page: 1 })} />
        <OrdersToolbar
          initialQuery={params.q}
          waveActive={params.waveToVerify}
          waveCount={waveCount}
          waveHref={hrefFor(params, { waveToVerify: !params.waveToVerify, page: 1 })}
        />
      </div>

      {orders.length > 0 ? (
        <OrderList orders={orders} />
      ) : noOrdersAtAll ? (
        <ListEmptyState
          tone="welcome"
          icon={<Inbox strokeWidth={1.5} aria-hidden="true" />}
          title="Aucune commande pour le moment"
          description="Les commandes passées sur la boutique arriveront ici, les plus anciennes en premier dans chaque file : à confirmer, à expédier, en livraison."
        />
      ) : params.q || params.waveToVerify ? (
        <ListEmptyState
          icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
          title="Aucune commande ne correspond"
          description={params.q ? 'Vérifiez le numéro, le nom ou le téléphone.' : 'Aucun paiement Wave à vérifier dans cet onglet.'}
          clearHref={hrefFor(params, { q: undefined, waveToVerify: false, page: 1 })}
        />
      ) : (
        <ListEmptyState
          icon={EMPTY_TAB[params.tab].done ? <CircleCheck strokeWidth={1.5} aria-hidden="true" /> : <Inbox strokeWidth={1.5} aria-hidden="true" />}
          title={EMPTY_TAB[params.tab].title}
          description={EMPTY_TAB[params.tab].description}
        />
      )}

      <Pagination
        page={params.page}
        pageCount={pageCount}
        total={total}
        perPage={ORDERS_PER_PAGE}
        buildHref={(page) => hrefFor(params, { page })}
      />
    </div>
  );
}
