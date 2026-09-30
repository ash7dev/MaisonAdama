import { StockMovementType } from '@prisma/client';
import type { Tx } from '@/lib/db-context';
import { moveStock, sortByVariant } from './move-stock';

/**
 * Remise en stock d'une commande annulée (mouvements ANNULATION).
 * La base garantit qu'elle n'a lieu qu'une fois par ligne, et seulement si la
 * commande passe à ANNULEE dans la même transaction.
 */
export async function releaseStockForCancelledOrder(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { variantId: true, quantity: true },
  });

  for (const item of sortByVariant(items)) {
    await moveStock(tx, {
      variantId: item.variantId,
      quantity: item.quantity,
      type: StockMovementType.ANNULATION,
      orderId,
    });
  }
}
