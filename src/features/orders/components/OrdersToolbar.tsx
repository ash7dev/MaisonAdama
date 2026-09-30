'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, LoaderCircle, Search, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Recherche (numéro, nom, téléphone) et filtre « Wave à vérifier », dans l'URL. */
export default function OrdersToolbar({
  initialQuery,
  waveActive,
  waveCount,
  waveHref,
}: {
  initialQuery?: string;
  waveActive: boolean;
  waveCount: number;
  waveHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (document.activeElement?.id !== 'order-search') setQuery(initialQuery ?? '');
  }, [initialQuery]);

  useEffect(() => {
    if (query === (initialQuery ?? '')) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set('q', query.trim());
      else params.delete('q');
      params.delete('page');
      startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div role="search" className="relative flex-1">
        <label htmlFor="order-search" className="sr-only">
          Rechercher une commande
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-or-profond">
          {isPending ? (
            <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Search className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          )}
        </span>
        <input
          id="order-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder="N° de commande, nom ou téléphone…"
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

      <Link
        href={waveHref}
        scroll={false}
        aria-pressed={waveActive}
        className={cn(
          'flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm transition-colors duration-150',
          waveActive ? 'bg-[#1F5673] font-medium text-white' : 'border border-filet bg-lin text-encre hover:border-filet-fort',
        )}
      >
        {waveActive ? (
          <Check className="size-4" strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <Smartphone className="size-4 text-[#1F5673]" strokeWidth={1.8} aria-hidden="true" />
        )}
        Wave à vérifier
        <span
          className={cn(
            'grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums',
            waveActive ? 'bg-white/20 text-white' : waveCount > 0 ? 'bg-[#DCEBF3] text-[#1F5673]' : 'bg-sable text-fumee',
          )}
        >
          {waveCount}
        </span>
      </Link>
    </div>
  );
}
