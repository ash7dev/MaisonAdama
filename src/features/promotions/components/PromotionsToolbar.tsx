'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PromotionTypeFilter = 'tous' | 'pourcentage' | 'montant';

const TYPE_FILTERS: ReadonlyArray<{ key: PromotionTypeFilter; label: string }> = [
  { key: 'tous', label: 'Tous types' },
  { key: 'pourcentage', label: '%' },
  { key: 'montant', label: 'FCFA' },
];

/** Recherche (nom de la promotion ou d'un produit ciblé) et filtre par type, dans l'URL. */
export default function PromotionsToolbar({
  initialQuery,
  type,
  typeHref,
}: {
  initialQuery?: string;
  type: PromotionTypeFilter;
  typeHref: Record<PromotionTypeFilter, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (document.activeElement?.id !== 'promotion-search') setQuery(initialQuery ?? '');
  }, [initialQuery]);

  useEffect(() => {
    if (query === (initialQuery ?? '')) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set('q', query.trim());
      else params.delete('q');
      startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div role="search" className="relative flex-1">
        <label htmlFor="promotion-search" className="sr-only">
          Rechercher une promotion
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-or-profond">
          {isPending ? (
            <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Search className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          )}
        </span>
        <input
          id="promotion-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder="Nom de la promotion ou d’un produit…"
          autoComplete="off"
          enterKeyHint="search"
          className="h-12 w-full rounded-full border border-filet bg-lin pl-11 pr-11 text-[0.9375rem] text-encre outline-none transition-colors duration-150 placeholder:text-fumee/60 hover:border-filet-fort focus:border-or focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)] [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Effacer la recherche"
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-fumee transition-colors duration-150 hover:bg-sable hover:text-encre"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      <div role="group" aria-label="Type de remise" className="flex h-12 shrink-0 items-center gap-1 rounded-full border border-filet bg-lin p-1">
        {TYPE_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={typeHref[f.key]}
            scroll={false}
            aria-pressed={type === f.key}
            className={cn(
              'flex h-full flex-1 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-150 sm:flex-none',
              type === f.key ? 'bg-oud font-medium text-sur-oud' : 'text-fumee hover:bg-sable hover:text-encre',
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
