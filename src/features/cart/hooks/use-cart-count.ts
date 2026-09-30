// src/features/cart/hooks/use-cart-count.ts
'use client';

import { useSyncExternalStore } from 'react';
import { useCartStore } from '../store';

const noopSubscribe = () => () => { };

/**
 * Le panier est persisté côté navigateur : le serveur ne le connaît pas.
 * On renvoie 0 pendant le rendu serveur et la première hydratation,
 * puis le vrai nombre. Évite l'erreur "hydration mismatch" de Next.js.
 */
export function useCartCount(): number {
    const count = useCartStore((state) => state.getTotalItems());
    const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
    return isClient ? count : 0;
}