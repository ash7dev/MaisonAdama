import type { StockMovementType } from '@prisma/client';
import type { Tx } from '@/lib/db-context';

export interface StockMove {
  variantId: string;
  /** Signé : +10 réassort, -2 vente */
  quantity: number;
  type: StockMovementType;
  orderId?: string;
  note?: string;
}

/**
 * Seule porte d'entrée du stock : appelle la fonction SQL move_stock(), qui
 * modifie la variante ET écrit le mouvement, de façon atomique.
 * Toute écriture directe de product_variants.stock est refusée par la base.
 * Renvoie le stock après mouvement.
 */
export async function moveStock(tx: Tx, move: StockMove): Promise<number> {
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    SELECT move_stock(
      ${move.variantId}::uuid,
      ${move.quantity}::int,
      ${move.type}::stock_movement_type,
      ${move.orderId ?? null}::uuid,
      ${move.note ?? null}::text
    ) AS stock`;
  return rows[0].stock;
}

/**
 * Tri par variante : deux commandes concurrentes verrouillent les lignes dans
 * le même ordre, ce qui évite les interblocages (deadlocks).
 */
export function sortByVariant<T extends { variantId: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));
}
