import { StockMovementType } from '@prisma/client';
import { withAdmin } from '@/lib/db-context';
import { toDomainError } from '@/lib/db-errors';
import { ValidationError } from '@/lib/errors';
import { moveStock } from './move-stock';

export interface RestockInput {
  variantId: string;
  /** Quantité reçue (> 0) */
  quantity: number;
  note?: string;
}

export interface AdjustStockInput {
  variantId: string;
  /** Correction signée : -1 pour une casse, +2 après inventaire */
  delta: number;
  /** Justification obligatoire (casse, inventaire…) */
  note: string;
}

/** Réassort : le vendeur ajoute du stock. Renvoie le nouveau stock. */
export async function restock(adminId: string, input: RestockInput): Promise<number> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new ValidationError('La quantité réassortie doit être un entier positif');
  }
  try {
    return await withAdmin(adminId, (tx) =>
      moveStock(tx, { variantId: input.variantId, quantity: input.quantity, type: StockMovementType.REASSORT, note: input.note }),
    );
  } catch (error) {
    throw toDomainError(error);
  }
}

/** Correction manuelle, signée et justifiée (exigé par la base). Renvoie le nouveau stock. */
export async function adjustStock(adminId: string, input: AdjustStockInput): Promise<number> {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new ValidationError('La correction doit être un entier non nul');
  }
  if (!input.note.trim()) {
    throw new ValidationError('Une correction de stock doit être justifiée');
  }
  try {
    return await withAdmin(adminId, (tx) =>
      moveStock(tx, { variantId: input.variantId, quantity: input.delta, type: StockMovementType.AJUSTEMENT, note: input.note.trim() }),
    );
  } catch (error) {
    throw toDomainError(error);
  }
}
