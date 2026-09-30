'use server';

import { revalidateTag } from 'next/cache';
import { ADMIN_COUNTS_TAG } from '@/features/admin/queries';
import { DASHBOARD_TAG } from '@/features/dashboard/queries';
import { SHOP_TAG } from '@/features/shop/queries';
import { DomainError, ValidationError } from '@/lib/errors';
import { placeOrder } from '../services/place-order';
import type { PlaceOrderInput } from '../schemas';

export type PlaceOrderResult =
  | { ok: true; token: string; orderNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string };

const MESSAGES: Record<string, string> = {
  STOCK_INSUFFICIENT: 'Un article vient de passer en rupture ou n’a plus assez de stock. Vérifiez votre panier.',
  PRICE_CHANGED: 'Un prix vient de changer. Vérifiez votre panier avant de valider.',
  DISCOUNT_INVALID: 'Une promotion vient de se terminer. Vérifiez votre panier avant de valider.',
  PRODUCT_UNAVAILABLE: 'Un article de votre panier n’est plus disponible.',
  DELIVERY_ZONE_UNAVAILABLE: 'Cette zone de livraison n’est plus desservie. Choisissez-en une autre.',
};

/**
 * Passe la commande (service transactionnel, idempotent). Le navigateur
 * n'envoie que des identifiants et des quantités : tout le reste est relu en base.
 */
export async function placeOrderAction(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    const order = await placeOrder(input);
    // Nouvelle commande : badge « à confirmer », tableau de bord, stock de la boutique.
    revalidateTag(ADMIN_COUNTS_TAG);
    revalidateTag(DASHBOARD_TAG);
    revalidateTag(SHOP_TAG);
    return { ok: true, token: order.publicToken, orderNumber: order.orderNumber };
  } catch (error) {
    if (error instanceof ValidationError) {
      const fieldErrors = Object.fromEntries(Object.entries(error.errors ?? {}).map(([k, v]) => [k, v[0] ?? 'Champ invalide']));
      return { ok: false, error: 'Vérifiez les informations en rouge.', fieldErrors, code: error.code };
    }
    if (error instanceof DomainError) {
      return { ok: false, error: MESSAGES[error.code] ?? error.message, code: error.code };
    }
    console.error('placeOrderAction', error);
    return { ok: false, error: 'La commande n’a pas pu être enregistrée. Réessayez, ou commandez sur WhatsApp.' };
  }
}
