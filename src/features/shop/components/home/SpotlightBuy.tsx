'use client';

import { useState } from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import type { ShopProduct } from '../../queries';
import { defaultVariant, useAddToCart } from '../../use-add-to-cart';

/** Choix de la contenance et ajout au panier, dans « Sous la lampe ». */
export default function SpotlightBuy({ product }: { product: ShopProduct }) {
  const [selectedId, setSelectedId] = useState(() => defaultVariant(product).id);
  const { add, addedId } = useAddToCart();
  const variant = product.variants.find((v) => v.id === selectedId) ?? product.variants[0];
  const price = variant.price - variant.discount;
  const added = addedId === variant.id;

  return (
    <div className="flex flex-col gap-4">
      {product.variants.length > 1 && (
        <div role="radiogroup" aria-label="Contenance" className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
          {product.variants.map((v) => {
            const on = v.id === variant.id;
            const out = v.stock <= 0;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={out}
                onClick={() => setSelectedId(v.id)}
                className={cn(
                  'flex min-h-[4.25rem] flex-col items-start justify-center gap-0.5 rounded-[18px] px-4 text-left transition-colors duration-150 disabled:opacity-40 sm:min-w-[9.5rem]',
                  on ? 'bg-or/15 text-sur-oud ring-2 ring-inset ring-or' : 'text-sur-oud/80 ring-1 ring-inset ring-or/30 hover:ring-or/60',
                )}
              >
                <strong className="text-[0.9375rem]">{v.label}</strong>
                <span className="whitespace-nowrap text-[0.8125rem] tabular-nums">
                  {out ? 'Épuisé' : formatFCFA(v.price - v.discount)}
                  {!out && v.discount > 0 && <span className="ml-1.5 text-sur-oud/50 line-through">{formatFCFA(v.price)}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        disabled={variant.stock <= 0}
        onClick={() => add(product, variant)}
        className={cn(
          'flex h-14 items-center justify-center gap-2.5 rounded-full px-7 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:opacity-50 sm:self-start',
          added ? 'bg-succes text-white' : 'bg-sur-oud text-encre hover:bg-paille',
        )}
      >
        {added ? <Check className="size-5" strokeWidth={2.4} aria-hidden="true" /> : <ShoppingBag className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />}
        {variant.stock <= 0 ? 'Épuisé' : added ? 'Ajouté au panier' : `Ajouter au panier · ${formatFCFA(price)}`}
      </button>
    </div>
  );
}
