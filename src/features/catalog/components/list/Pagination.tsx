import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Pages visibles : 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, pageCount: number): Array<number | 'gap'> {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('gap');
    result.push(p);
  });
  return result;
}

export default function Pagination({
  page,
  pageCount,
  total,
  perPage,
  buildHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const arrow = 'grid size-11 place-items-center rounded-full border border-filet bg-lin text-oud transition-colors duration-150 hover:border-filet-fort';

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-fumee">
        <span className="tabular-nums">{from}–{to}</span> sur <span className="tabular-nums">{total}</span> produits
      </p>
      <ul className="flex items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={buildHref(page - 1)} aria-label="Page précédente" className={arrow}>
              <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(arrow, 'opacity-35')}>
              <ChevronLeft className="size-4" strokeWidth={2} />
            </span>
          )}
        </li>
        {pageWindow(page, pageCount).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-fumee">
              …
            </li>
          ) : (
            <li key={p} className="hidden sm:block">
              <Link
                href={buildHref(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'grid size-11 place-items-center rounded-full text-sm tabular-nums transition-colors duration-150',
                  p === page ? 'bg-oud font-medium text-sur-oud' : 'text-encre hover:bg-lin',
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        <li className="px-2 text-sm tabular-nums text-fumee sm:hidden">
          {page} / {pageCount}
        </li>
        <li>
          {page < pageCount ? (
            <Link href={buildHref(page + 1)} aria-label="Page suivante" className={arrow}>
              <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
            </Link>
          ) : (
            <span aria-hidden="true" className={cn(arrow, 'opacity-35')}>
              <ChevronRight className="size-4" strokeWidth={2} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
