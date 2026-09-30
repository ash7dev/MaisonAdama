'use client';

import { useCallback, useRef, useState } from 'react';
import { useCartStore } from '@/features/cart/store';
import type { ShopProduct, ShopVariant } from './queries';

/**
 * Ajout au panier avec le prix calculé par le serveur (promotion déduite).
 * Le checkout revérifie tout en base : le panier n'est qu'une intention.
 * `added` passe à true 1,8 s pour confirmer visuellement l'ajout.
 */
export function useAddToCart() {
  const addItem = useCartStore((s) => s.addItem);
  const [addedId, setAddedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const add = useCallback(
    (product: ShopProduct, variant: ShopVariant, quantity = 1) => {
      if (variant.stock <= 0) return;
      addItem(
        {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          variantLabel: variant.label,
          unitPrice: variant.price,
          unitDiscount: variant.discount,
          imageStoragePath: product.images[0]?.path,
        },
        quantity,
      );
      setAddedId(variant.id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setAddedId(null), 1800);
    },
    [addItem],
  );

  return { add, addedId };
}

/** Contenance proposée par défaut : la moins chère encore en stock. */
export function defaultVariant(product: ShopProduct): ShopVariant {
  const available = product.variants.filter((v) => v.stock > 0);
  const pool = available.length ? available : product.variants;
  return pool.reduce((best, v) => (v.price - v.discount < best.price - best.discount ? v : best), pool[0]);
}
