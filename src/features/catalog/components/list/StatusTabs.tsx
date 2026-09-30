import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PendingSpinner } from '@/components/ui/link-pending';
import { PRODUCT_STATUSES, type ProductStatusFilter } from '../../queries/list-products';

const LABELS: Record<ProductStatusFilter, string> = {
  tous: 'Tous',
  publies: 'Publiés',
  brouillons: 'Brouillons',
  'stock-bas': 'Stock bas',
  archives: 'Archivés',
};

/** Onglets de statut, avec compteurs (qui tiennent compte de la recherche et de la catégorie). */
export default function StatusTabs({
  current,
  counts,
  buildHref,
}: {
  current: ProductStatusFilter;
  counts: Record<ProductStatusFilter, number>;
  buildHref: (status: ProductStatusFilter) => string;
}) {
  return (
    <nav aria-label="Filtrer par statut" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1.5 rounded-full bg-lin p-1.5 ring-1 ring-inset ring-filet">
        {PRODUCT_STATUSES.map((status) => {
          const active = status === current;
          const alert = status === 'stock-bas' && counts[status] > 0;
          return (
            <li key={status}>
              <Link
                href={buildHref(status)}
                scroll={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-150',
                  active ? 'bg-oud font-medium text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre',
                )}
              >
                {LABELS[status]}
                <PendingSpinner className={active ? 'text-sur-oud' : undefined} />
                <span
                  className={cn(
                    'grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                    active ? 'bg-sur-oud/15 text-sur-oud' : alert ? 'bg-alerte-fond text-alerte' : 'bg-sable text-fumee',
                  )}
                >
                  {counts[status]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
