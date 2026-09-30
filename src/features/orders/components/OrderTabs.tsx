import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PendingSpinner } from '@/components/ui/link-pending';
import { ORDER_TABS, type OrderTab } from '../queries';

const LABELS: Record<OrderTab, string> = {
  toutes: 'Toutes',
  'a-confirmer': 'À confirmer',
  'a-expedier': 'À expédier',
  'en-livraison': 'En livraison',
  livrees: 'Livrées',
  annulees: 'Annulées',
};

/** Les files qui demandent une action sont mises en évidence dès qu'elles ne sont pas vides. */
const ACTION_TABS: OrderTab[] = ['a-confirmer', 'a-expedier', 'en-livraison'];

export default function OrderTabs({
  current,
  counts,
  buildHref,
}: {
  current: OrderTab;
  counts: Record<OrderTab, number>;
  buildHref: (tab: OrderTab) => string;
}) {
  return (
    <nav aria-label="Filtrer par statut" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1.5 rounded-full bg-lin p-1.5 ring-1 ring-inset ring-filet">
        {ORDER_TABS.map((tab) => {
          const active = tab === current;
          const needsAction = ACTION_TABS.includes(tab) && counts[tab] > 0;
          return (
            <li key={tab}>
              <Link
                href={buildHref(tab)}
                scroll={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-150',
                  active ? 'bg-oud font-medium text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre',
                )}
              >
                {LABELS[tab]}
                <PendingSpinner className={active ? 'text-sur-oud' : undefined} />
                <span
                  className={cn(
                    'grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                    active ? 'bg-sur-oud/15 text-sur-oud' : needsAction ? 'bg-or text-encre' : 'bg-sable text-fumee',
                  )}
                >
                  {counts[tab]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
