'use client';

import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopProduct } from '../../queries';
import { defaultVariant, useAddToCart } from '../../use-add-to-cart';

/** Ajout direct depuis le cartel du produit du jour (contenance la moins chère disponible). */
export default function ShelfQuickAdd({ product }: { product: ShopProduct }) {
  const { add, addedId } = useAddToCart();
  const variant = defaultVariant(product);
  const added = addedId === variant.id;
  return (
    <button
      type="button"
      disabled={!product.inStock}
      onClick={() => add(product, variant)}
      aria-label={`Ajouter ${product.name} (${variant.label}) au panier`}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-150 disabled:opacity-40 lg:size-12',
        added ? 'bg-succes text-white' : 'bg-oud text-sur-oud hover:bg-encre',
      )}
    >
      {added ? <Check className="size-5" strokeWidth={2.4} aria-hidden="true" /> : <Plus className="size-5" strokeWidth={2} aria-hidden="true" />}
    </button>
  );
}
