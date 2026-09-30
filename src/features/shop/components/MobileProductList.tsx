'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import type { ShopProduct } from '../queries';
import { defaultVariant, useAddToCart } from '../use-add-to-cart';
import ProductVisual from './ProductVisual';

/** Grandes cartes (une par ligne) et choix de la contenance dans une feuille. */
export default function MobileProductList({ products }: { products: ShopProduct[] }) {
  const { add, addedId } = useAddToCart();
  const [picking, setPicking] = useState<ShopProduct | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (!picking) return;
    setVariantId(defaultVariant(picking).id);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPicking(null);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [picking]);

  const pickedVariant = picking?.variants.find((v) => v.id === variantId);

  return (
    <>
      <ul className="flex flex-col gap-7">
        {products.map((p, i) => {
          const single = p.variants.length === 1 ? p.variants[0] : null;
          const justAdded = single && addedId === single.id;
          return (
            <li key={p.id}>
              <article className="flex flex-col gap-3">
                <Link href={`/produits/${p.slug}`} className="relative block">
                  <ProductVisual
                    image={p.images[0]}
                    name={p.name}
                    categorySlug={p.categorySlug}
                    seed={p.id}
                    sizes="(max-width: 1024px) 100vw, 1px"
                    priority={i < 2}
                    bottleClassName="w-[26%]"
                    className="aspect-[16/12] rounded-[26px]"
                  />
                  <span className="absolute left-3 top-3 flex gap-1.5">
                    {p.bestPercent ? <span className="rounded-full bg-oud px-2.5 py-1 text-xs font-bold text-sur-oud">−{p.bestPercent}&nbsp;%</span> : null}
                    {p.isNew && <span className="rounded-full bg-lin px-2.5 py-1 text-xs font-semibold text-oud ring-1 ring-inset ring-filet">Nouveau</span>}
                    {!p.inStock && <span className="rounded-full bg-encre/70 px-2.5 py-1 text-xs font-semibold text-lin">Épuisé</span>}
                  </span>
                </Link>
                <div className="flex items-end justify-between gap-3 px-1">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[0.625rem] tracking-[0.2em] text-or-profond">{p.categoryName.toUpperCase()}</span>
                    <Link href={`/produits/${p.slug}`} className="font-display text-[1.375rem] leading-tight text-encre">
                      {p.name}
                    </Link>
                    <span className="truncate text-xs text-fumee">
                      {p.variants.length > 1 ? `${p.variants.length} contenances` : p.variants[0]?.label}
                      {p.families.length > 0 && ` · ${p.families.slice(0, 2).join(', ')}`}
                    </span>
                    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                      {p.fromPrice !== p.toPrice && <span className="text-xs text-fumee">dès</span>}
                      <span className={cn('text-[0.9375rem] font-bold tabular-nums', p.bestPercent ? 'text-erreur' : 'text-encre')}>{formatFCFA(p.fromPrice)}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!p.inStock}
                    onClick={() => (single ? add(p, single) : setPicking(p))}
                    className={cn(
                      'flex h-12 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[0.8125rem] font-semibold transition-colors duration-150 disabled:opacity-40',
                      justAdded ? 'bg-succes text-white' : 'bg-oud text-sur-oud',
                    )}
                  >
                    {justAdded ? <Check className="size-4" strokeWidth={2.4} aria-hidden="true" /> : <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />}
                    {justAdded ? 'Ajouté' : p.inStock ? 'Ajouter' : 'Épuisé'}
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {picking && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button type="button" aria-label="Fermer" onClick={() => setPicking(null)} className="absolute inset-0 bg-encre/50 motion-safe:animate-fade-in" />
          <section role="dialog" aria-modal="true" aria-labelledby="pick-title" className="absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-t-[32px] bg-lin px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 motion-safe:animate-sheet-up">
            <span aria-hidden="true" className="mx-auto h-[5px] w-11 rounded-full bg-filet-fort" />
            <div className="flex items-center gap-3.5">
              <ProductVisual image={picking.images[0]} name={picking.name} categorySlug={picking.categorySlug} seed={picking.id} sizes="64px" bottleClassName="w-[40%]" className="size-16 shrink-0 rounded-2xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[0.625rem] tracking-[0.2em] text-or-profond">{picking.categoryName.toUpperCase()}</span>
                <h2 id="pick-title" className="truncate text-[1.375rem] leading-tight text-encre">{picking.name}</h2>
              </div>
              <button type="button" aria-label="Fermer" onClick={() => setPicking(null)} className="grid size-11 shrink-0 place-items-center rounded-full bg-sable text-oud">
                <X className="size-4" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
            <div role="radiogroup" aria-label="Contenance" className="flex flex-col gap-2">
              {picking.variants.map((v) => {
                const on = v.id === variantId;
                const out = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={out}
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      'flex h-14 items-center justify-between rounded-2xl px-4 text-left transition-colors duration-150 disabled:opacity-40',
                      on ? 'bg-white ring-2 ring-inset ring-oud' : 'bg-white/60 ring-1 ring-inset ring-filet',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cn('grid size-5 place-items-center rounded-full border-2', on ? 'border-oud' : 'border-filet-fort')}>
                        {on && <span className="size-2 rounded-full bg-oud" />}
                      </span>
                      <span className="text-[0.9375rem] font-medium text-encre">{v.label}</span>
                    </span>
                    <span className="flex items-baseline gap-2 whitespace-nowrap">
                      {out ? (
                        <span className="text-sm text-fumee">Épuisé</span>
                      ) : (
                        <>
                          {v.discount > 0 && <span className="text-xs text-fumee line-through">{formatFCFA(v.price)}</span>}
                          <span className={cn('text-[0.9375rem] font-bold tabular-nums', v.discount > 0 ? 'text-erreur' : 'text-encre')}>{formatFCFA(v.price - v.discount)}</span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!pickedVariant || pickedVariant.stock <= 0}
              onClick={() => {
                if (!pickedVariant) return;
                add(picking, pickedVariant);
                setPicking(null);
              }}
              className="h-14 rounded-full bg-oud text-[0.9375rem] font-bold text-sur-oud disabled:opacity-50"
            >
              Ajouter au panier{pickedVariant ? ` · ${formatFCFA(pickedVariant.price - pickedVariant.discount)}` : ''}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
