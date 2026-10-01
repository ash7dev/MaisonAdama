'use server';

import { OrderStatus } from '@prisma/client';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ADMIN_COUNTS_TAG } from '@/features/admin/queries';
import { DASHBOARD_TAG } from '@/features/dashboard/queries';
import { SHOP_TAG } from '@/features/shop/queries';
import { requireAdmin } from '@/features/auth/require-admin';
import { toDomainError } from '@/lib/db-errors';
import { DomainError } from '@/lib/errors';
import {
  adjustDeliveryFee,
  cancelOrder,
  changeOrderStatus,
  completeDelivery,
  markOrderPaid,
  markOrderRefunded,
  markOrderUnpaid,
} from '../services';

export type OrderActionResult = { ok: true; message: string } | { ok: false; error: string };

/** Pages à rafraîchir : liste, détail, badges de navigation, tableau de bord. */
function revalidateOrder(orderId: string) {
  revalidateTag(ADMIN_COUNTS_TAG); // badges « à confirmer », « Wave à vérifier »
  revalidateTag(DASHBOARD_TAG); // chiffre d'affaires, activité du jour
  revalidateTag(SHOP_TAG); // stock rendu à l'annulation, classement des best-sellers
  // Tout le site : stock rendu (boutique), classement, badges et fiche de la commande.
  revalidatePath('/', 'layout');
}

async function run(orderId: string, message: string, fn: (adminId: string) => Promise<unknown>): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  try {
    await fn(admin.id);
    revalidateOrder(orderId);
    return { ok: true, message };
  } catch (error) {
    const domain = toDomainError(error);
    if (domain instanceof DomainError) return { ok: false, error: domain.message };
    console.error('Action commande impossible', error);
    return { ok: false, error: 'L’action n’a pas pu être enregistrée. Réessayez dans un instant.' };
  }
}

export async function confirmOrderAction(orderId: string) {
  return run(orderId, 'Commande confirmée.', (adminId) => changeOrderStatus(adminId, orderId, OrderStatus.CONFIRMEE));
}

export async function shipOrderAction(orderId: string) {
  return run(orderId, 'Commande en livraison.', (adminId) => changeOrderStatus(adminId, orderId, OrderStatus.EN_LIVRAISON));
}

/** Livrée ; « collected » : le livreur a encaissé (paiement à la livraison). */
export async function deliverOrderAction(orderId: string, collected: boolean) {
  return run(orderId, collected ? 'Commande livrée et encaissée.' : 'Commande livrée.', (adminId) =>
    completeDelivery(adminId, orderId, collected),
  );
}

export async function cancelOrderAction(orderId: string, reason: string) {
  return run(orderId, 'Commande annulée : le stock a été remis en rayon.', (adminId) => cancelOrder(adminId, orderId, reason));
}

export async function markOrderPaidAction(orderId: string, reference?: string) {
  const clean = reference?.trim().slice(0, 80) || undefined;
  return run(orderId, 'Paiement enregistré.', (adminId) => markOrderPaid(adminId, orderId, clean));
}

export async function refundOrderAction(orderId: string) {
  return run(orderId, 'Remboursement enregistré.', (adminId) => markOrderRefunded(adminId, orderId));
}

/** Correction d'une erreur de saisie : le paiement n'avait pas eu lieu. */
export async function markOrderUnpaidAction(orderId: string) {
  return run(orderId, 'Paiement annulé (correction).', (adminId) => markOrderUnpaid(adminId, orderId));
}

export async function adjustDeliveryFeeAction(orderId: string, fee: number, note: string) {
  return run(orderId, 'Frais de livraison mis à jour.', (adminId) => adjustDeliveryFee(adminId, orderId, fee, note));
}
