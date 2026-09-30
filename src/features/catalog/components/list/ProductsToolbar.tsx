'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';
import type { ProductSort } from '../../queries/list-products';

const SORT_LABELS: Record<ProductSort, string> = {
  recents: 'Plus récents',
  modifies: 'Modifiés récemment',
  nom: 'Nom (A → Z)',
  anciens: 'Plus anciens',
};

const selectClass =
  'h-12 appearance-none rounded-full border border-filet bg-lin bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pl-4 pr-10 text-sm text-encre outline-none transition-colors duration-150 hover:border-filet-fort focus:border-or focus:shadow-[0_0_0_4px_rgb(180_138_44/0.15)]';

// Chevron du menu déroulant (couleur fumée), en image de fond.
const chevron: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237A6653' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

/**
 * Recherche (instantanée, sans accents), catégorie et tri : tout vit dans l'URL,
 * ce qui rend la vue partageable et compatible avec le bouton Retour.
 */
export default function ProductsToolbar({
  categories,
  initial,
}: {
  categories: Array<{ name: string; slug: string }>;
  initial: { q?: string; category?: string; sort: ProductSort };
}) {
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
    params.delete('page'); // tout changement de filtre repart de la première page
    const url = params.size ? `${pathname}?${params}` : pathname;
    startTransition(() => router.replace(url, { scroll: false }));
  }

  // Filtres effacés depuis un lien (« Effacer les filtres ») : le champ suit l'URL,
  // sauf pendant la frappe.
  useEffect(() => {
    if (document.activeElement?.id !== 'product-search') setQuery(initial.q ?? '');
  }, [initial.q]);

  // La recherche part 300 ms après la dernière frappe.
  useEffect(() => {
    if (query === (initial.q ?? '')) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate({ q: query.trim() || undefined }), 300);
    return () => clearTimeout(timer.current);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div role="search" className="relative flex-1">
        <label htmlFor="product-search" className="sr-only">
          Rechercher un produit
        </label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-or-profond">
          {isPending ? (
            <LoaderCircle className="size-[18px] motion-safe:animate-spin" strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Search className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          )}
        </span>
        <input
          id="product-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
          placeholder="Nom, mot-clé ou référence…"
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

      <div className="grid grid-cols-2 gap-2.5 sm:flex">
        <label htmlFor="product-category" className="sr-only">
          Catégorie
        </label>
        <select
          id="product-category"
          value={initial.category ?? ''}
          onChange={(e) => navigate({ categorie: e.target.value || undefined })}
          className={selectClass}
          style={chevron}
        >
          <option value="">Toutes catégories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="product-sort" className="sr-only">
          Trier par
        </label>
        <select
          id="product-sort"
          value={initial.sort}
          onChange={(e) => navigate({ tri: e.target.value === 'recents' ? undefined : e.target.value })}
          className={selectClass}
          style={chevron}
        >
          {(Object.keys(SORT_LABELS) as ProductSort[]).map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
