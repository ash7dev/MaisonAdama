import { OrderStatus, PaymentStatus } from '@prisma/client';
import { withAdmin, type Tx } from '@/lib/db-context';
import { toDomainError } from '@/lib/db-errors';
import { DomainError, OrderNotFoundError, ValidationError } from '@/lib/errors';
import { releaseStockForCancelledOrder } from '@/features/inventory/services/release-stock';
import { assertValidPaymentTransition, assertValidStatusTransition } from '../status-machine';

/**
 * Actions admin sur les commandes. Toutes passent par withAdmin() : la base
 * enregistre l'auteur (historique des statuts, audit, confirmation de paiement).
 *
 * Chaque changement est conditionnel à l'état lu (UPDATE … WHERE status = lu) :
 * si un autre admin a agi entre-temps, l'action échoue au lieu d'écraser.
 */

async function run<T>(adminId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await withAdmin(adminId, fn);
  } catch (error) {
    throw toDomainError(error);
  }
}

async function loadOrder(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentStatus: true, subtotal: true, discountTotal: true },
  });
  if (!order) throw new OrderNotFoundError(orderId);
  return order;
}

function concurrentChange(): never {
  throw new DomainError('La commande a été modifiée entre-temps, rechargez la page', 'CONCURRENT_UPDATE');
}

/** Confirmer, expédier, livrer. L'annulation passe par cancelOrder(). */
export function changeOrderStatus(adminId: string, orderId: string, next: OrderStatus) {
  if (next === OrderStatus.ANNULEE) {
    throw new ValidationError('Utilisez cancelOrder() pour annuler (motif obligatoire, stock libéré)');
  }
  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertValidStatusTransition(order.status, next);
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: next },
    });
    if (count === 0) concurrentChange();
  });
}

/** Annule la commande et remet le stock en rayon, dans la même transaction. */
export function cancelOrder(adminId: string, orderId: string, reason: string) {
  const cancelReason = reason.trim();
  if (!cancelReason) throw new ValidationError("Le motif d'annulation est obligatoire");

  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertValidStatusTransition(order.status, OrderStatus.ANNULEE);
    if (order.paymentStatus === PaymentStatus.PAYE) {
      throw new DomainError('Commande payée : enregistrez d’abord le remboursement', 'REFUND_REQUIRED');
    }
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: OrderStatus.ANNULEE, cancelReason },
    });
    if (count === 0) concurrentChange();
    await releaseStockForCancelledOrder(tx, orderId);
  });
}

/** Paiement constaté (Wave Business ou retour du livreur). */
export function markOrderPaid(adminId: string, orderId: string, paymentReference?: string) {
  return setPaymentStatus(adminId, orderId, PaymentStatus.PAYE, paymentReference);
}

export function markOrderRefunded(adminId: string, orderId: string) {
  return setPaymentStatus(adminId, orderId, PaymentStatus.REMBOURSE);
}

/** Correction d'une erreur de saisie (PAYE → NON_PAYE), tracée par l'audit. */
export function markOrderUnpaid(adminId: string, orderId: string) {
  return setPaymentStatus(adminId, orderId, PaymentStatus.NON_PAYE);
}

function setPaymentStatus(adminId: string, orderId: string, next: PaymentStatus, paymentReference?: string) {
  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertValidPaymentTransition(order.paymentStatus, next);
    const { count } = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: order.paymentStatus },
      data: { paymentStatus: next, ...(paymentReference ? { paymentReference } : {}) },
    });
    if (count === 0) concurrentChange();
  });
}

/** Ajuste les frais de livraison d'une commande précise (localité éloignée…). */
export function adjustDeliveryFee(adminId: string, orderId: string, deliveryFee: number, note: string) {
  if (!Number.isInteger(deliveryFee) || deliveryFee < 0) {
    throw new ValidationError('Les frais de livraison sont un entier FCFA positif ou nul');
  }
  const deliveryFeeNote = note.trim();
  if (!deliveryFeeNote) throw new ValidationError("La raison de l'ajustement est obligatoire");

  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.status === OrderStatus.LIVREE || order.status === OrderStatus.ANNULEE) {
      throw new DomainError('Commande clôturée : frais non modifiables', 'ORDER_LOCKED');
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        deliveryFee,
        deliveryFeeNote,
        total: order.subtotal - order.discountTotal + deliveryFee,
      },
    });
  });
}

/**
 * Remise au client : passe à LIVREE et, pour un paiement à la livraison encaissé
 * par le livreur, marque la commande payée — en UNE transaction (le trigger date
 * la livraison et le paiement, et signe l'encaissement au nom de l'admin).
 */
export function completeDelivery(adminId: string, orderId: string, collected: boolean) {
  return run(adminId, async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentStatus: true, paymentMethod: true },
    });
    if (!order) throw new OrderNotFoundError(orderId);
    assertValidStatusTransition(order.status, OrderStatus.LIVREE);

    const collect = collected && order.paymentStatus === PaymentStatus.NON_PAYE;
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status, paymentStatus: order.paymentStatus },
      data: { status: OrderStatus.LIVREE, ...(collect ? { paymentStatus: PaymentStatus.PAYE } : {}) },
    });
    if (count === 0) concurrentChange();
  });
}
