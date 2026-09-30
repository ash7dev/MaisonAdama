import { StockMovementType } from '@prisma/client';
import type { Tx } from '@/lib/db-context';
import { moveStock, sortByVariant } from './move-stock';

export interface StockReservationItem {
  variantId: string;
  quantity: number;
}

/**
 * Réservation du stock à la création d'une commande (mouvements VENTE).
 * Atomique en base : la dernière bouteille ne peut pas être vendue deux fois
 * (erreur [MA001] pour la commande perdante).
 */
export async function reserveStockForOrder(tx: Tx, orderId: string, items: StockReservationItem[]) {
  for (const item of sortByVariant(items)) {
    await moveStock(tx, {
      variantId: item.variantId,
      quantity: -item.quantity,
      type: StockMovementType.VENTE,
      orderId,
    });
  }
}
