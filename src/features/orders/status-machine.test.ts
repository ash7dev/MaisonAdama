import { describe, expect, it } from 'vitest';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { InvalidStatusTransitionError } from '@/lib/errors';
import {
  assertValidStatusTransition,
  canTransitionOrder,
  canTransitionPayment,
  nextOrderStatuses,
} from './status-machine';

const { EN_ATTENTE, CONFIRMEE, EN_LIVRAISON, LIVREE, ANNULEE } = OrderStatus;

describe('machine d’états des commandes', () => {
  it.each([
    [EN_ATTENTE, CONFIRMEE],
    [EN_ATTENTE, ANNULEE],
    [CONFIRMEE, EN_LIVRAISON],
    [CONFIRMEE, ANNULEE],
    [EN_LIVRAISON, LIVREE],
  ])('%s → %s est autorisé', (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(true);
  });

  it.each([
    [EN_ATTENTE, LIVREE],
    [EN_ATTENTE, EN_LIVRAISON],
    [EN_LIVRAISON, ANNULEE],
    [LIVREE, ANNULEE],
    [ANNULEE, EN_ATTENTE],
  ])('%s → %s est refusé', (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(false);
  });

  it('rester dans le même statut n’est pas une transition (pas de double annulation)', () => {
    for (const status of Object.values(OrderStatus)) {
      expect(canTransitionOrder(status, status)).toBe(false);
    }
  });

  it('LIVREE et ANNULEE sont terminaux', () => {
    expect(nextOrderStatuses(LIVREE)).toEqual([]);
    expect(nextOrderStatuses(ANNULEE)).toEqual([]);
  });

  it('lève une InvalidStatusTransitionError', () => {
    expect(() => assertValidStatusTransition(ANNULEE, ANNULEE)).toThrow(InvalidStatusTransitionError);
  });
});

describe('machine d’états des paiements', () => {
  it('NON_PAYE → PAYE → REMBOURSE, avec correction PAYE → NON_PAYE', () => {
    expect(canTransitionPayment(PaymentStatus.NON_PAYE, PaymentStatus.PAYE)).toBe(true);
    expect(canTransitionPayment(PaymentStatus.PAYE, PaymentStatus.REMBOURSE)).toBe(true);
    expect(canTransitionPayment(PaymentStatus.PAYE, PaymentStatus.NON_PAYE)).toBe(true);
  });

  it('refuse de rembourser une commande non payée et de sortir de REMBOURSE', () => {
    expect(canTransitionPayment(PaymentStatus.NON_PAYE, PaymentStatus.REMBOURSE)).toBe(false);
    expect(canTransitionPayment(PaymentStatus.REMBOURSE, PaymentStatus.PAYE)).toBe(false);
  });
});
