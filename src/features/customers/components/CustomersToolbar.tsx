'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';
import type { CustomerSort } from '../queries';

const SORT_LABELS: Record<CustomerSort, string> = {
  recents: 'Commande la plus récente',
  depense: 'Plus gros total dépensé',
  commandes: 'Plus de commandes',
  nom: 'Nom (A → Z)',
};

const selectClass =
  'h-12 w-full appearance-none rounded-full border border-filet bg-lin bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pl-4 pr-10 text-sm text-encre outline-none transition-colors duration-150 hover:border-filet-fort focus:border-or focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)] sm:w-auto';

const chevron: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237A6653' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

/** Recherche (nom sans accents ou numéro) et tri, dans l'URL. */
export default function CustomersToolbar({ initial }: { initial: { q?: string; sort: CustomerSort } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initial.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (document.activeElement?.id !== 'customer-search') setQuery(initial.q ?? '');
  }, [initial.q]);

  useEffect(() => {
    if (query === (initial.q ?? '')) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate({ q: query.trim() || undefined }), 300);
    return () => clearTimeout(timer.current);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div role="search" className="relative flex-1">
        <label htmlFor="customer-search" className="sr-only">
          Rechercher un client
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-or-profond">
          {isPending ? (
            <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Search className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          )}
        </span>
        <input
          id="customer-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder="Nom ou numéro de téléphone…"
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

      <label htmlFor="customer-sort" className="sr-only">
        Trier par
      </label>
      <select
        id="customer-sort"
        value={initial.sort}
        onChange={(e) => navigate({ tri: e.target.value === 'recents' ? undefined : e.target.value })}
        className={selectClass}
        style={chevron}
      >
        {(Object.keys(SORT_LABELS) as CustomerSort[]).map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
    </div>
  );
}
