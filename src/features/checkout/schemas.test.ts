import { describe, expect, it } from 'vitest';
import { placeOrderSchema, type PlaceOrderInput } from './schemas';

const valid: PlaceOrderInput = {
  idempotencyKey: '0192f0a0-0000-7000-8000-000000000001',
  customerName: 'Aminata Diallo',
  customerPhone: '77 123 45 67',
  deliveryZoneId: '0192f0a0-0000-7000-8000-000000000002',
  city: 'Mermoz',
  address: 'Rue 10, villa 4',
  landmark: '',
  paymentMethod: 'WAVE',
  items: [{ variantId: '0192f0a0-0000-7000-8000-000000000003', quantity: 2 }],
};

describe('placeOrderSchema', () => {
  it('normalise le téléphone et vide les champs optionnels vides', () => {
    const result = placeOrderSchema.parse(valid);
    expect(result.customerPhone).toBe('+221771234567');
    expect(result.landmark).toBeUndefined();
  });

  it.each([
    ['quantité négative', { items: [{ variantId: valid.items[0].variantId, quantity: -5 }] }],
    ['quantité nulle', { items: [{ variantId: valid.items[0].variantId, quantity: 0 }] }],
    ['quantité décimale', { items: [{ variantId: valid.items[0].variantId, quantity: 1.5 }] }],
    ['quantité excessive', { items: [{ variantId: valid.items[0].variantId, quantity: 21 }] }],
    ['panier vide', { items: [] }],
    ['variante non UUID', { items: [{ variantId: 'dakar-centre', quantity: 1 }] }],
    ['zone non UUID', { deliveryZoneId: 'dakar-centre' }],
    ['téléphone étranger', { customerPhone: '+33 6 12 34 56 78' }],
    ['nom vide', { customerName: '   ' }],
    ['paiement inconnu', { paymentMethod: 'ORANGE_MONEY' }],
  ])('refuse : %s', (_label, patch) => {
    expect(placeOrderSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});
