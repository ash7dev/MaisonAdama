import { afterAll, describe, expect, it } from 'vitest';
import { StockMovementType, VariantUnit } from '@prisma/client';
import { placeOrder } from '@/features/checkout/services/place-order';
import { adjustStock, restock } from '@/features/inventory/services/adjust-stock';
import { createAdmin, createProduct, createZone, HAS_DB, orderInput, prisma, restockRaw, stockOf } from './helpers';

describe.runIf(HAS_DB)('stock : une seule porte d’entrée, move_stock()', () => {
  afterAll(async () => {
    const drift = await prisma.$queryRaw<unknown[]>`SELECT * FROM stock_ledger_discrepancies()`;
    expect(drift).toEqual([]);
  });

  it('génère des identifiants UUID v7', async () => {
    const { variantId } = await createProduct();
    expect(variantId[14]).toBe('7');
  });

  it('refuse une variante créée avec un stock non nul', async () => {
    const { productId } = await createProduct();
    await expect(
      prisma.productVariant.create({
        data: { productId, size: 100, unit: VariantUnit.ML, label: '100 ml', price: 40000, stock: 5 },
      }),
    ).rejects.toThrow(/\[MA010\]/);
  });

  it('refuse toute écriture directe du stock', async () => {
    const { variantId } = await createProduct();
    await expect(prisma.productVariant.update({ where: { id: variantId }, data: { stock: 999 } })).rejects.toThrow(/\[MA010\]/);
    await expect(
      prisma.$executeRaw`INSERT INTO stock_movements (variant_id, type, quantity, stock_after) VALUES (${variantId}::uuid, 'REASSORT', 5, 15)`,
    ).rejects.toThrow(/\[MA010\]/);
  });

  it('move_stock met à jour le stock et journalise le stock résultant', async () => {
    const { variantId } = await createProduct({ stock: 4 });
    const admin = await createAdmin();
    expect(await restock(admin, { variantId, quantity: 6, note: 'Livraison fournisseur' })).toBe(10);

    const last = await prisma.stockMovement.findFirstOrThrow({
      where: { variantId, type: StockMovementType.REASSORT, adminId: admin },
    });
    expect(last).toMatchObject({ quantity: 6, stockAfter: 10, note: 'Livraison fournisseur' });
  });

  it('refuse de passer sous zéro (MA001) et signale une variante inconnue (MA002)', async () => {
    const { variantId } = await createProduct({ stock: 2 });
    await expect(restockRaw(variantId, -3)).rejects.toThrow(/\[MA001\]/);
    await expect(restockRaw('00000000-0000-7000-8000-000000000000', 1)).rejects.toThrow(/\[MA002\]/);
    expect(await stockOf(variantId)).toBe(2);
  });

  it('exige qu’un ajustement soit signé et justifié', async () => {
    const { variantId } = await createProduct({ stock: 5 });
    await expect(
      prisma.$queryRaw`SELECT move_stock(${variantId}::uuid, -1, 'AJUSTEMENT'::stock_movement_type, NULL, 'Casse')`,
    ).rejects.toThrow(/stock_movements_adjustment_justified/);

    const admin = await createAdmin();
    expect(await adjustStock(admin, { variantId, delta: -1, note: 'Flacon cassé' })).toBe(4);
  });

  it('rend le journal immuable', async () => {
    const { variantId } = await createProduct();
    const movement = await prisma.stockMovement.findFirstOrThrow({ where: { variantId } });
    await expect(prisma.stockMovement.update({ where: { id: movement.id }, data: { note: 'x' } })).rejects.toThrow(/\[MA020\]/);
    await expect(prisma.stockMovement.delete({ where: { id: movement.id } })).rejects.toThrow(/\[MA020\]/);
  });

  it('ne vend jamais deux fois la dernière bouteille, même en simultané', async () => {
    const { variantId } = await createProduct({ stock: 1 });
    const zone = await createZone();

    const results = await Promise.allSettled([
      placeOrder(orderInput(zone.id, [{ variantId, quantity: 1 }])),
      placeOrder(orderInput(zone.id, [{ variantId, quantity: 1 }], { customerPhone: '78 000 00 01' })),
      placeOrder(orderInput(zone.id, [{ variantId, quantity: 1 }], { customerPhone: '78 000 00 02' })),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')) {
      expect(r.reason).toMatchObject({ code: 'STOCK_INSUFFICIENT' });
    }
    expect(await stockOf(variantId)).toBe(0);
  });
});
