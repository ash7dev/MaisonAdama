import { describe, expect, it } from 'vitest';
import { PromotionType } from '@prisma/client';
import { computeBestPrice, type ApplicablePromotion } from './compute-price';

const pct = (id: string, value: number): ApplicablePromotion => ({ id, name: id, type: PromotionType.POURCENTAGE, value });
const fixed = (id: string, value: number): ApplicablePromotion => ({ id, name: id, type: PromotionType.MONTANT_FIXE, value });

describe('computeBestPrice', () => {
  it('sans promotion, renvoie le prix catalogue', () => {
    expect(computeBestPrice(25000, [])).toEqual({
      originalPrice: 25000,
      finalPrice: 25000,
      discountAmount: 0,
      appliedPromotion: null,
    });
  });

  it('applique un pourcentage', () => {
    expect(computeBestPrice(25000, [pct('p', 20)]).finalPrice).toBe(20000);
  });

  it('arrondit la remise au FCFA, demi vers le haut (comme round() SQL)', () => {
    // 12 345 × 10 % = 1 234,5 → 1 235
    expect(computeBestPrice(12345, [pct('p', 10)]).discountAmount).toBe(1235);
  });

  it('plafonne un montant fixe au prix', () => {
    const result = computeBestPrice(3000, [fixed('f', 5000)]);
    expect(result.finalPrice).toBe(0);
    expect(result.discountAmount).toBe(3000);
  });

  it('retient la promotion la plus avantageuse, sans cumul', () => {
    const result = computeBestPrice(25000, [pct('dix', 10), fixed('fixe', 4000), pct('quinze', 15)]);
    expect(result.appliedPromotion?.id).toBe('fixe');
    expect(result.discountAmount).toBe(4000);
    expect(result.finalPrice).toBe(21000);
  });

  it("ignore une promotion dont la remise arrondie est nulle", () => {
    expect(computeBestPrice(4, [pct('p', 10)]).appliedPromotion).toBeNull();
  });
});
