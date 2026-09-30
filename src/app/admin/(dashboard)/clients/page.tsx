import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Crown, Moon, SearchX, Sparkles, UsersRound } from 'lucide-react';
import { requireAdmin } from '@/features/auth/require-admin';
import {
  CUSTOMERS_PER_PAGE,
  getCustomerOverview,
  listAdminCustomers,
  parseCustomerListParams,
  type CustomerListParams,
  type CustomerSegment,
} from '@/features/customers/queries';
import SegmentTabs from '@/features/customers/components/SegmentTabs';
import CustomersToolbar from '@/features/customers/components/CustomersToolbar';
import CustomerList from '@/features/customers/components/CustomerList';
import ListEmptyState from '@/components/admin/ListEmptyState';
import Pagination from '@/features/catalog/components/list/Pagination';

export const metadata: Metadata = {
  title: 'Clients · Administration Maison Adama',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function hrefFor(params: CustomerListParams, changes: Partial<CustomerListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.segment !== 'tous') query.set('segment', next.segment);
  if (next.q) query.set('q', next.q);
  if (next.sort !== 'recents') query.set('tri', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  return query.size ? `/admin/clients?${query}` : '/admin/clients';
}

const EMPTY_SEGMENT: Record<Exclude<CustomerSegment, 'tous'>, { icon: React.ReactNode; title: string; description: string }> = {
  fideles: {
    icon: <Crown strokeWidth={1.5} aria-hidden="true" />,
    title: 'Pas encore de client fidèle',
    description: 'Les clients qui reviennent commander une deuxième fois apparaîtront ici.',
  },
  nouveaux: {
    icon: <Sparkles strokeWidth={1.5} aria-hidden="true" />,
    title: 'Aucun nouveau client',
    description: 'Personne n’a passé sa première commande ces 30 derniers jours.',
  },
  'a-relancer': {
    icon: <Moon strokeWidth={1.5} aria-hidden="true" />,
    title: 'Personne à relancer',
    description: 'Tous vos clients ont commandé ces 60 derniers jours.',
  },
};

const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseCustomerListParams(await searchParams);
  const [, { customers, segmentCounts, total, pageCount }, overview] = await Promise.all([
    requireAdmin(),
    listAdminCustomers(params),
    getCustomerOverview(),
  ]);

  if (params.page > pageCount) redirect(hrefFor(params, { page: pageCount }));

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6 lg:px-2 lg:pb-8 lg:pt-3">
      <header className="flex flex-col gap-2 px-1 lg:min-h-[72px] lg:justify-center">
        <h1 className="text-[1.875rem] leading-none text-encre lg:text-[2.125rem]">Clients</h1>
        <p className="text-sm text-fumee">
          <span className="font-medium tabular-nums text-encre">{overview.customers}</span> client{overview.customers > 1 ? 's' : ''}
          {' · '}
          <span className="tabular-nums">{overview.newThisMonth}</span> ce mois-ci
          {overview.repeatRate !== null && (
            <>
              {' · '}
              <span className="font-medium tabular-nums text-or-profond">{percent.format(overview.repeatRate)}</span> reviennent commander
            </>
          )}
        </p>
      </header>

      <div className="flex flex-col gap-3.5">
        <SegmentTabs current={params.segment} counts={segmentCounts} buildHref={(segment) => hrefFor(params, { segment, page: 1 })} />
        <CustomersToolbar initial={{ q: params.q, sort: params.sort }} />
      </div>

      {customers.length > 0 ? (
        <CustomerList customers={customers} />
      ) : overview.customers === 0 ? (
        <ListEmptyState
          tone="welcome"
          icon={<UsersRound strokeWidth={1.5} aria-hidden="true" />}
          title="Aucun client pour le moment"
          description="Chaque client est ajouté automatiquement à sa première commande, identifié par son numéro de téléphone. Vous retrouverez ici son historique, ses produits préférés et ses adresses."
        />
      ) : params.q ? (
        <ListEmptyState
          icon={<SearchX strokeWidth={1.5} aria-hidden="true" />}
          title="Aucun client ne correspond"
          description="Vérifiez l’orthographe du nom ou tapez quelques chiffres du numéro."
          clearHref={hrefFor(params, { q: undefined, page: 1 })}
        />
      ) : params.segment !== 'tous' ? (
        <ListEmptyState
          icon={EMPTY_SEGMENT[params.segment].icon}
          title={EMPTY_SEGMENT[params.segment].title}
          description={EMPTY_SEGMENT[params.segment].description}
        />
      ) : null}

      <Pagination
        page={params.page}
        pageCount={pageCount}
        total={total}
        perPage={CUSTOMERS_PER_PAGE}
        buildHref={(page) => hrefFor(params, { page })}
      />
    </div>
  );
}
