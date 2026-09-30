import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PendingSpinner } from '@/components/ui/link-pending';
import { CUSTOMER_SEGMENTS, type CustomerSegment } from '../queries';

const LABELS: Record<CustomerSegment, string> = {
  tous: 'Tous',
  fideles: 'Fidèles',
  nouveaux: 'Nouveaux',
  'a-relancer': 'À relancer',
};

const HINTS: Record<CustomerSegment, string> = {
  tous: 'Tous les clients',
  fideles: 'Au moins 2 commandes',
  nouveaux: 'Première commande il y a moins de 30 jours',
  'a-relancer': 'Aucune commande depuis plus de 60 jours',
};

export default function SegmentTabs({
  current,
  counts,
  buildHref,
}: {
  current: CustomerSegment;
  counts: Record<CustomerSegment, number>;
  buildHref: (segment: CustomerSegment) => string;
}) {
  return (
    <nav aria-label="Filtrer par segment" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1.5 rounded-full bg-lin p-1.5 ring-1 ring-inset ring-filet">
        {CUSTOMER_SEGMENTS.map((segment) => {
          const active = segment === current;
          return (
            <li key={segment}>
              <Link
                href={buildHref(segment)}
                scroll={false}
                title={HINTS[segment]}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-150',
                  active ? 'bg-oud font-medium text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre',
                )}
              >
                {LABELS[segment]}
                <PendingSpinner className={active ? 'text-sur-oud' : undefined} />
                <span
                  className={cn(
                    'grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
                    active ? 'bg-sur-oud/15 text-sur-oud' : 'bg-sable text-fumee',
                  )}
                >
                  {counts[segment]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
