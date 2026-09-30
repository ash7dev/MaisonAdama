'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  unitDiscount: number;
  quantity: number;
  imageStoragePath?: string;
}

/** Mise à jour venue du serveur (prix, remise, nom, photo). */
export type CartItemRefresh = Partial<Omit<CartItem, 'variantId' | 'quantity'>> & { variantId: string };

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem: (variantId: string) => void;
  /** Remet un article retiré à sa place (bouton « Annuler »). */
  restoreItem: (item: CartItem, index: number) => void;
  updateQuantity: (variantId: string, qty: number) => void;
  /** Aligne les prix et libellés du panier sur ceux du serveur. */
  refreshItems: (updates: CartItemRefresh[]) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem, qty = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.variantId === newItem.variantId);
        set({
          items: existing
            ? items.map((i) => (i.variantId === newItem.variantId ? { ...i, ...newItem, quantity: i.quantity + qty } : i))
            : [...items, { ...newItem, quantity: qty }],
        });
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter((i) => i.variantId !== variantId) });
      },

      restoreItem: (item, index) => {
        const items = get().items.filter((i) => i.variantId !== item.variantId);
        items.splice(Math.min(index, items.length), 0, item);
        set({ items });
      },

      updateQuantity: (variantId, qty) => {
        if (qty <= 0) {
          get().removeItem(variantId);
          return;
        }
        set({ items: get().items.map((i) => (i.variantId === variantId ? { ...i, quantity: qty } : i)) });
      },

      refreshItems: (updates) => {
        const byId = new Map(updates.map((u) => [u.variantId, u]));
        set({ items: get().items.map((i) => (byId.has(i.variantId) ? { ...i, ...byId.get(i.variantId) } : i)) });
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => get().items.reduce((total, i) => total + (i.unitPrice - i.unitDiscount) * i.quantity, 0),

      getTotalItems: () => get().items.reduce((total, i) => total + i.quantity, 0),
    }),
    {
      name: 'maison-adama-cart',
    },
  ),
);
