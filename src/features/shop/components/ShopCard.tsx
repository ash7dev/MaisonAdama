'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import type { ShopProduct } from '../queries';
import { useAddToCart } from '../use-add-to-cart';
import ProductVisual from './ProductVisual';

/**
 * Carte produit en grille : visuel 4:5, badges, ajout rapide. Plusieurs
 * contenances ? Le « + » ouvre un petit choix sur place.
 */
export default function ShopCard({ product, highlight, priority = false }: { product: ShopProduct; highlight?: string[]; priority?: boolean }) {
  const { add, addedId } = useAddToCart();
  const [choosing, setChoosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const single = product.variants.length === 1 ? product.variants[0] : null;
  const added = product.variants.some((v) => v.id === addedId);

  useEffect(() => {
    if (!choosing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setChoosing(false);
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setChoosing(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [choosing]);

  return (
    <article className="flex min-w-0 flex-col gap-3.5">
      <div ref={ref} className="relative">
        <Link href={`/produits/${product.slug}`} aria-label={product.name} className="group block overflow-hidden rounded-[28px]">
          <ProductVisual
            image={product.images[0]}
            name={product.name}
            categorySlug={product.categorySlug}
            seed={product.id}
            sizes="(min-width: 1280px) 280px, (min-width: 1024px) 25vw, 50vw"
            priority={priority}
            className="aspect-[4/5] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </Link>
        <span className="pointer-events-none absolute left-3.5 top-3.5 flex gap-1.5">
          {product.bestPercent ? <span className="rounded-full bg-oud px-2.5 py-1 text-xs font-bold text-sur-oud">−{product.bestPercent}&nbsp;%</span> : null}
          {product.isNew && <span className="rounded-full bg-lin px-2.5 py-1 text-xs font-semibold text-oud ring-1 ring-inset ring-filet">Nouveau</span>}
          {!product.inStock && <span className="rounded-full bg-encre/70 px-2.5 py-1 text-xs font-semibold text-lin">Épuisé</span>}
        </span>
        <button
          type="button"
          disabled={!product.inStock}
          aria-label={single ? `Ajouter ${product.name} au panier` : `Choisir la contenance de ${product.name}`}
          aria-expanded={single ? undefined : choosing}
          onClick={() => (single ? add(product, single) : setChoosing((v) => !v))}
          className={cn(
            'absolute bottom-3 right-3 grid size-12 place-items-center rounded-full shadow-[0_8px_20px_rgb(43_29_18/0.2)] transition-colors duration-150 disabled:hidden',
            added ? 'bg-succes text-white' : 'bg-lin text-oud hover:bg-oud hover:text-sur-oud',
          )}
        >
          {added ? <Check className="size-5" strokeWidth={2.4} aria-hidden="true" /> : <Plus className="size-5" strokeWidth={2} aria-hidden="true" />}
        </button>
        {choosing && (
          <div role="dialog" aria-label="Contenance" className="absolute inset-x-3 bottom-[4.25rem] z-10 flex flex-col gap-1 rounded-2xl bg-white p-2 shadow-[0_20px_50px_rgb(43_29_18/0.22)] motion-safe:animate-reveal">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock <= 0}
                onClick={() => {
                  add(product, v);
                  setChoosing(false);
                }}
                className="flex h-11 items-center justify-between rounded-xl px-3 text-sm hover:bg-sable disabled:opacity-40"
              >
                <span className="font-medium text-encre">{v.label}</span>
                <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                  {v.discount > 0 && <span className="text-xs text-fumee line-through">{formatFCFA(v.price)}</span>}
                  <span className={cn('font-semibold tabular-nums', v.discount > 0 ? 'text-erreur' : 'text-encre')}>{v.stock <= 0 ? 'Épuisé' : formatFCFA(v.price - v.discount)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 px-1">
        <span className="text-[0.625rem] tracking-[0.2em] text-or-profond">{product.categoryName.toUpperCase()}</span>
        <Link href={`/produits/${product.slug}`} className="font-display text-[1.25rem] leading-tight text-encre decoration-or underline-offset-4 hover:underline">
          {product.name}
        </Link>
        {product.families.length > 0 && (
          <span className="flex flex-wrap gap-x-1.5 text-[0.8125rem] text-fumee">
            {product.families.map((f, i) => (
              <span key={f} className={cn(highlight?.includes(f) && 'font-semibold text-or-profond')}>
                {f}
                {i < product.families.length - 1 ? ' ·' : ''}
              </span>
            ))}
          </span>
        )}
        <span className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
          {product.fromPrice !== product.toPrice && <span className="text-xs text-fumee">dès</span>}
          <span className={cn('text-[0.9375rem] font-bold tabular-nums', product.bestPercent ? 'text-erreur' : 'text-encre')}>{formatFCFA(product.fromPrice)}</span>
        </span>
      </div>
    </article>
  );
}
