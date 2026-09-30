'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ImageIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { productImageUrl } from '@/lib/supabase/storage';
import type { PromotionPickerData } from '../queries';

type Product = PromotionPickerData['products'][number];

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Case à cocher à trois états : produit entier, quelques contenances, rien. */
function TriCheckbox({ checked, indeterminate, label, onChange }: { checked: boolean; indeterminate: boolean; label: string; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="size-5 shrink-0 cursor-pointer rounded accent-[#4A2E1C]"
    />
  );
}

/**
 * Sélection des produits : recherche sans accents, filtre par catégorie, produit
 * entier (toutes ses contenances, y compris celles ajoutées plus tard) ou
 * contenances précises.
 */
export default function ProductPicker({
  products,
  categories,
  productIds,
  variantIds,
  onChange,
  error,
}: {
  products: Product[];
  categories: PromotionPickerData['categories'];
  productIds: Set<string>;
  variantIds: Set<string>;
  onChange: (productIds: Set<string>, variantIds: Set<string>) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return products.filter((p) => (!category || p.category.slug === category) && (!q || normalize(p.name).includes(q)));
  }, [products, query, category]);

  const presentCategories = categories.filter((c) => products.some((p) => p.category.slug === c.slug));

  const stateOf = (product: Product) => {
    if (productIds.has(product.id)) return 'all' as const;
    const picked = product.variants.filter((v) => variantIds.has(v.id)).length;
    return picked === 0 ? ('none' as const) : ('some' as const);
  };

  const toggleProduct = (product: Product) => {
    const nextProducts = new Set(productIds);
    const nextVariants = new Set(variantIds);
    for (const v of product.variants) nextVariants.delete(v.id);
    if (stateOf(product) === 'all') nextProducts.delete(product.id);
    else nextProducts.add(product.id);
    onChange(nextProducts, nextVariants);
  };

  const toggleVariant = (product: Product, variantId: string) => {
    const nextProducts = new Set(productIds);
    const nextVariants = new Set(variantIds);
    if (nextProducts.has(product.id)) {
      // Produit entier → toutes ses contenances sauf celle-ci.
      nextProducts.delete(product.id);
      for (const v of product.variants) if (v.id !== variantId) nextVariants.add(v.id);
    } else if (nextVariants.has(variantId)) {
      nextVariants.delete(variantId);
    } else {
      nextVariants.add(variantId);
      // Toutes cochées une à une → produit entier.
      if (product.variants.every((v) => nextVariants.has(v.id))) {
        for (const v of product.variants) nextVariants.delete(v.id);
        nextProducts.add(product.id);
      }
    }
    onChange(nextProducts, nextVariants);
  };

  const allVisibleSelected = visible.length > 0 && visible.every((p) => productIds.has(p.id));
  const toggleAllVisible = () => {
    const nextProducts = new Set(productIds);
    const nextVariants = new Set(variantIds);
    for (const p of visible) {
      for (const v of p.variants) nextVariants.delete(v.id);
      if (allVisibleSelected) nextProducts.delete(p.id);
      else nextProducts.add(p.id);
    }
    onChange(nextProducts, nextVariants);
  };

  const selectedProducts = productIds.size;
  const selectedVariants = variantIds.size;

  if (products.length === 0) {
    return (
      <p className="rounded-2xl bg-sable px-4 py-6 text-center text-sm text-fumee">
        Aucun produit avec une contenance active : créez d’abord vos produits.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="picker-search" className="sr-only">
            Rechercher un produit
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-or-profond" strokeWidth={1.7} aria-hidden="true" />
          <input
            id="picker-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit…"
            autoComplete="off"
            className="h-12 w-full rounded-full border border-filet bg-white/70 pl-11 pr-10 text-[0.9375rem] text-encre outline-none placeholder:text-fumee/60 focus:border-or [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Effacer" className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-fumee hover:bg-sable">
              <X className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
        <span
          aria-live="polite"
          className={cn('shrink-0 rounded-full px-3.5 py-2 text-[0.8125rem] font-medium', selectedProducts + selectedVariants ? 'bg-oud text-sur-oud' : 'bg-sable text-fumee')}
        >
          {selectedProducts + selectedVariants === 0
            ? 'Aucune sélection'
            : [
                selectedProducts && `${selectedProducts} produit${selectedProducts > 1 ? 's' : ''}`,
                selectedVariants && `${selectedVariants} contenance${selectedVariants > 1 ? 's' : ''}`,
              ]
                .filter(Boolean)
                .join(' · ')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[{ slug: null, name: 'Toutes' }, ...presentCategories].map((c) => (
          <button
            key={c.slug ?? 'all'}
            type="button"
            aria-pressed={category === c.slug}
            onClick={() => setCategory(c.slug)}
            className={cn(
              'h-9 rounded-full px-3.5 text-[0.8125rem] transition-colors duration-150',
              category === c.slug ? 'bg-oud text-sur-oud' : 'border border-filet text-encre hover:border-filet-fort',
            )}
          >
            {c.name}
          </button>
        ))}
        <button
          type="button"
          onClick={toggleAllVisible}
          disabled={visible.length === 0}
          className="ml-auto h-9 rounded-full px-3 text-[0.8125rem] font-medium text-or-profond hover:bg-sable disabled:opacity-40"
        >
          {allVisibleSelected ? 'Tout désélectionner' : `Tout sélectionner (${visible.length})`}
        </button>
      </div>

      <div
        role="group"
        aria-label="Produits"
        aria-describedby={error ? 'targets-error' : undefined}
        className={cn('max-h-[28rem] overflow-y-auto rounded-3xl border bg-white/60', error ? 'border-erreur' : 'border-filet')}
      >
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-fumee">Aucun produit ne correspond.</p>
        ) : (
          <ul className="divide-y divide-filet/70">
            {visible.map((product) => {
              const state = stateOf(product);
              const open = expanded.has(product.id) || state === 'some';
              const prices = product.variants.map((v) => v.price);
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              const url = productImageUrl(product.images[0]?.storagePath);
              return (
                <li key={product.id} className={cn(state !== 'none' && 'bg-paille/25')}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <TriCheckbox
                      checked={state === 'all'}
                      indeterminate={state === 'some'}
                      label={`${product.name} (toutes les contenances)`}
                      onChange={() => toggleProduct(product)}
                    />
                    <button type="button" onClick={() => toggleProduct(product)} className="flex min-w-0 flex-1 items-center gap-3 text-left" tabIndex={-1}>
                      <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-paille/60">
                        {url ? <Image src={url} alt="" fill sizes="44px" className="object-cover" /> : <ImageIcon className="size-4 text-or-profond/50" strokeWidth={1.4} aria-hidden="true" />}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[0.9375rem] font-medium text-encre">
                          {product.name}
                          {!product.isPublished && <span className="ml-2 rounded-full bg-sable px-2 py-0.5 text-[0.6875rem] font-normal text-fumee">brouillon</span>}
                        </span>
                        <span className="truncate text-[0.8125rem] text-fumee">
                          {product.category.name} · {min === max ? formatFCFA(min) : `${new Intl.NumberFormat('fr-FR').format(min)} – ${formatFCFA(max)}`}
                        </span>
                      </span>
                    </button>
                    {product.variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(product.id)) next.delete(product.id);
                            else next.add(product.id);
                            return next;
                          })
                        }
                        aria-expanded={open}
                        aria-label={`Choisir des contenances de ${product.name}`}
                        className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.8125rem] text-fumee hover:bg-sable hover:text-encre"
                      >
                        {product.variants.length} <span className="hidden sm:inline">contenances</span>
                        <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {open && product.variants.length > 1 && (
                    <ul className="flex flex-col gap-1 pb-3 pl-[4.25rem] pr-4">
                      {product.variants.map((variant) => (
                        <li key={variant.id}>
                          <label className="flex h-10 cursor-pointer items-center gap-3 rounded-xl px-2 text-sm text-encre hover:bg-white">
                            <input
                              type="checkbox"
                              checked={state === 'all' || variantIds.has(variant.id)}
                              onChange={() => toggleVariant(product, variant.id)}
                              className="size-[18px] accent-[#4A2E1C]"
                            />
                            <span className="flex-1">{variant.label}</span>
                            <span className="tabular-nums text-fumee">{formatFCFA(variant.price)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && (
        <p id="targets-error" className="text-sm text-erreur">
          {error}
        </p>
      )}
      <p className="text-[0.8125rem] text-fumee">
        Un produit entier inclut aussi les contenances que vous lui ajouterez plus tard.
      </p>
    </div>
  );
}
