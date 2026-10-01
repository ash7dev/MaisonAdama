// src/components/layout/SearchDialog.tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, LoaderCircle, Search } from 'lucide-react';
import { formatFCFA } from '@/lib/money';
import { searchSuggestionsAction, type SearchSuggestion } from '@/features/shop/actions';
import ProductVisual from '@/features/shop/components/ProductVisual';
import { POPULAR_SEARCHES, SHOP_CATEGORIES } from './nav-config';

const searchHref = (q: string) => `/boutique?q=${encodeURIComponent(q)}`;
type Results = { q: string; total: number; items: SearchSuggestion[] };

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Recherche en surimpression : plein écran sur mobile, panneau centré sur desktop.
 * <dialog> natif : piège du focus, touche Échap et fond gérés par le navigateur.
 */
export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [pending, startTransition] = useTransition();
  const request = useRef(0);
  const trimmed = query.trim();
  const typing = trimmed.length >= 2;

  // Suggestions pendant la frappe : 180 ms de pause, seule la dernière réponse compte.
  useEffect(() => {
    if (!typing) {
      request.current++;
      setResults(null);
      return;
    }
    const id = ++request.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const r = await searchSuggestionsAction(trimmed);
        if (id === request.current) setResults({ q: trimmed, ...r });
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [trimmed, typing]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    // La page ne défile pas derrière la recherche.
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmed) return;
    onClose();
    router.push(searchHref(trimmed));
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Rechercher"
      onClose={onClose}
      // Clic sur le fond (hors du panneau) : fermeture.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-lin p-0 text-encre backdrop:bg-encre/40 backdrop:backdrop-blur-sm open:motion-safe:animate-reveal lg:mx-auto lg:mt-24 lg:h-auto lg:max-w-[47.5rem] lg:overflow-hidden lg:rounded-[32px] lg:shadow-lg"
    >
      <form
        role="search"
        onSubmit={handleSubmit}
        className="mx-3 mt-3.5 flex h-[60px] items-center gap-1.5 rounded-full border border-filet bg-sable pl-1.5 pr-2 lg:m-0 lg:h-[76px] lg:gap-3.5 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:pl-7 lg:pr-4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la recherche"
          className="grid size-11 shrink-0 place-items-center rounded-full text-oud lg:hidden"
        >
          <ArrowLeft className="size-5" strokeWidth={1.7} aria-hidden="true" />
        </button>
        {pending ? (
          <LoaderCircle className="hidden size-[22px] shrink-0 animate-spin text-or-profond lg:block" strokeWidth={1.6} aria-hidden="true" />
        ) : (
          <Search className="hidden size-[22px] shrink-0 text-or-profond lg:block" strokeWidth={1.6} aria-hidden="true" />
        )}
        <label htmlFor="site-search" className="sr-only">
          Rechercher un produit
        </label>
        <input
          id="site-search"
          name="q"
          type="search"
          autoFocus
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-controls="search-results"
          enterKeyHint="search"
          placeholder="Parfum, musc, thiouraye…"
          className="h-11 min-w-0 flex-1 bg-transparent font-display text-[1.25rem] text-encre outline-none placeholder:text-fumee/70 lg:text-[1.5rem]"
        />
        <button
          type="button"
          onClick={onClose}
          className="hidden h-9 shrink-0 items-center rounded-full bg-sable px-3.5 text-[0.78125rem] tracking-[0.04em] text-fumee transition-colors duration-150 hover:text-encre lg:flex"
        >
          Échap
        </button>
      </form>

      <div className="grid gap-8 px-5 pb-8 pt-7 lg:grid-cols-2 lg:px-7 lg:pt-6">
        {typing ? (
          <section id="search-results" aria-live="polite" aria-busy={pending} className="flex min-h-[12rem] flex-col gap-2">
            <h2 className="mb-1 flex items-center gap-2 font-sans text-[0.71875rem] font-normal tracking-[0.24em] text-or-profond">
              CRÉATIONS
              {pending && <LoaderCircle className="size-3.5 animate-spin lg:hidden" strokeWidth={2} aria-hidden="true" />}
            </h2>
            {results && results.items.length > 0 ? (
              <>
                <ul className="flex flex-col">
                  {results.items.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/produits/${p.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-3.5 rounded-2xl p-2 transition-colors duration-150 hover:bg-sable"
                      >
                        <ProductVisual
                          image={p.image}
                          name={p.name}
                          categorySlug={p.categorySlug}
                          seed={p.id}
                          sizes="56px"
                          className="h-[4.25rem] w-14 shrink-0 rounded-xl"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate font-display text-[1.0625rem] text-encre">{p.name}</span>
                          <span className="text-xs text-fumee">
                            {p.categoryName}
                            {!p.inStock && ' · épuisé'}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end whitespace-nowrap text-sm">
                          <strong className={p.bestPercent ? 'text-erreur' : 'text-encre'}>
                            {p.hasRange && <span className="font-normal text-fumee">dès </span>}
                            {formatFCFA(p.fromPrice)}
                          </strong>
                          {p.bestPercent ? <span className="text-xs font-semibold text-erreur">−{p.bestPercent}&nbsp;%</span> : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={searchHref(results.q)}
                  onClick={onClose}
                  className="mt-1 flex h-12 items-center justify-between rounded-full bg-oud pl-5 pr-2 text-sm font-semibold text-sur-oud transition-colors duration-150 hover:bg-encre"
                >
                  Voir {results.total > 1 ? `les ${results.total} résultats` : 'le résultat'}
                  <span className="grid size-9 place-items-center rounded-full bg-sur-oud text-oud">
                    <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
                  </span>
                </Link>
              </>
            ) : results && !pending ? (
              <p className="rounded-2xl bg-sable px-4 py-5 text-sm leading-relaxed text-fumee">
                Aucune création pour <strong className="text-encre">« {results.q} »</strong>. Essayez un mot plus court, ou parcourez un univers.
              </p>
            ) : (
              <ul aria-hidden="true" className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-3.5 p-2">
                    <span className="h-[4.25rem] w-14 animate-pulse rounded-xl bg-sable" />
                    <span className="flex flex-1 flex-col gap-2">
                      <span className="h-4 w-2/3 animate-pulse rounded-full bg-sable" />
                      <span className="h-3 w-1/3 animate-pulse rounded-full bg-sable" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
        <section className="flex flex-col gap-3.5">
          <h2 className="font-sans text-[0.71875rem] font-normal tracking-[0.24em] text-or-profond">RECHERCHES FRÉQUENTES</h2>
          <ul className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <li key={term}>
                <Link
                  href={searchHref(term)}
                  onClick={onClose}
                  className="flex h-11 items-center rounded-full border border-filet px-4 text-sm text-oud transition-colors duration-150 hover:border-filet-fort hover:bg-sable lg:h-10"
                >
                  {term}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        )}

        <section className="flex flex-col gap-1.5">
          <h2 className="mb-2 font-sans text-[0.71875rem] font-normal tracking-[0.24em] text-or-profond">CATÉGORIES</h2>
          <ul>
            {SHOP_CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/boutique?univers=${category.slug}`}
                  onClick={onClose}
                  className="flex h-14 items-center justify-between border-b border-filet font-display text-[1.3125rem] text-encre transition-colors duration-150 hover:text-oud lg:h-11 lg:rounded-[14px] lg:border-0 lg:px-3.5 lg:text-[1.1875rem] lg:hover:bg-sable"
                >
                  {category.slug === 'encens' ? 'Encens (thiouraye)' : category.label}
                  <ArrowRight className="size-4 text-or" strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="hidden bg-sable px-7 py-3.5 text-sm text-fumee lg:block">
        « Thiouraye » et « bakhour » mènent aux mêmes encens · les accents sont facultatifs
      </p>
    </dialog>
  );
}
