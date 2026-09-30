import { OrderStatus, PaymentStatus } from '@prisma/client';
import { InvalidStatusTransitionError } from '@/lib/errors';

/**
 * Miroir applicatif des transitions garanties par le trigger orders_guard
 * (migration 20260930120200_integrity). Sert à l'interface (boutons proposés)
 * et à échouer tôt avec un message clair ; la base reste l'autorité.
 *
 *   EN_ATTENTE → CONFIRMEE → EN_LIVRAISON → LIVREE
 *        └────────────┴──→ ANNULEE
 */
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.EN_ATTENTE]: [OrderStatus.CONFIRMEE, OrderStatus.ANNULEE],
  [OrderStatus.CONFIRMEE]: [OrderStatus.EN_LIVRAISON, OrderStatus.ANNULEE],
  [OrderStatus.EN_LIVRAISON]: [OrderStatus.LIVREE],
  [OrderStatus.LIVREE]: [],
  [OrderStatus.ANNULEE]: [],
};

/** NON_PAYE → PAYE → REMBOURSE, plus la correction PAYE → NON_PAYE (tracée par l'audit). */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  [PaymentStatus.NON_PAYE]: [PaymentStatus.PAYE],
  [PaymentStatus.PAYE]: [PaymentStatus.REMBOURSE, PaymentStatus.NON_PAYE],
  [PaymentStatus.REMBOURSE]: [],
};

/**
 * Rester dans le même statut n'est PAS une transition : annuler une commande
 * déjà annulée doit échouer (sinon le stock serait libéré deux fois).
 */
export function canTransitionOrder(current: OrderStatus, next: OrderStatus): boolean {
  return ORDER_TRANSITIONS[current].includes(next);
}

export function nextOrderStatuses(current: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[current];
}

export function assertValidStatusTransition(current: OrderStatus, next: OrderStatus): void {
  if (!canTransitionOrder(current, next)) {
    throw new InvalidStatusTransitionError(current, next);
  }
}

export function canTransitionPayment(current: PaymentStatus, next: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[current].includes(next);
}

export function assertValidPaymentTransition(current: PaymentStatus, next: PaymentStatus): void {
  if (!canTransitionPayment(current, next)) {
    throw new InvalidStatusTransitionError(current, next);
  }
}
