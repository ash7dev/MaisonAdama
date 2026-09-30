import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { OrderStatus, PaymentStatus, PromotionType, StockMovementType } from '@prisma/client';
import { placeOrder } from '@/features/checkout/services/place-order';
import {
  adjustDeliveryFee,
  cancelOrder,
  changeOrderStatus,
  markOrderPaid,
  markOrderRefunded,
} from '@/features/orders/services';
import { moveStock } from '@/features/inventory/services/move-stock';
import { setAdminContext } from '@/lib/db-context';
import { InvalidStatusTransitionError } from '@/lib/errors';
import { createAdmin, createProduct, createZone, HAS_DB, orderInput, prisma, stockOf } from './helpers';

const DAY = 24 * 60 * 60 * 1000;

async function createPromotion(productId: string, type: PromotionType, value: number, options: { expired?: boolean } = {}) {
  const now = Date.now();
  return prisma.promotion.create({
    data: {
      name: `${type} ${value}`,
      type,
      value,
      startsAt: new Date(now - (options.expired ? 3 : 1) * DAY),
      endsAt: new Date(now + (options.expired ? -1 : 1) * DAY),
      targets: { create: { productId } },
    },
  });
}

/** Insère une commande à la main (sans le service) pour tester les règles de la base. */
function rawOrderData(zone: { id: string; name: string; defaultFee: number }, customerId: string) {
  return {
    idempotencyKey: randomUUID(),
    customerId,
    customerName: 'Test',
    customerPhone: '+221771234567',
    deliveryZoneId: zone.id,
    zoneName: zone.name,
    region: 'Dakar',
    defaultDeliveryFee: zone.defaultFee,
    deliveryFee: zone.defaultFee,
    city: 'Dakar',
    address: 'Rue 1',
    paymentMethod: 'A_LA_LIVRAISON' as const,
  };
}

async function testCustomer() {
  return prisma.customer.upsert({
    where: { phone: '+221771234567' },
    update: {},
    create: { name: 'Test', phone: '+221771234567' },
  });
}

describe.runIf(HAS_DB)('commandes : création', () => {
  it('crée la commande, fige les montants et réserve le stock', async () => {
    const { variantId, name } = await createProduct({ price: 25000, stock: 5 });
    const zone = await createZone(2000);

    const placed = await placeOrder(orderInput(zone.id, [{ variantId, quantity: 2 }]));
    expect(placed.orderNumber).toMatch(/^CMD-\d{4}-\d{5,}$/);
    expect(placed.publicToken).toMatch(/^[0-9a-f]{32}$/);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: placed.id }, include: { items: true, statusHistory: true } });
    expect(order).toMatchObject({ subtotal: 50000, discountTotal: 0, deliveryFee: 2000, defaultDeliveryFee: 2000, total: 52000, region: 'Dakar' });
    expect(order.customerPhone).toBe('+221771234567');
    expect(order.items[0]).toMatchObject({ productName: name, variantLabel: '50 ml', unitPrice: 25000, quantity: 2, lineTotal: 50000 });
    expect(order.statusHistory.map((h) => h.toStatus)).toEqual([OrderStatus.EN_ATTENTE]);
    expect(await stockOf(variantId)).toBe(3);
  });

  it('est idempotente : un double envoi ne crée qu’une commande', async () => {
    const { variantId } = await createProduct({ stock: 5 });
    const zone = await createZone();
    const input = orderInput(zone.id, [{ variantId, quantity: 1 }]);

    const [a, b] = await Promise.all([placeOrder(input), placeOrder(input)]);
    expect(a.id).toBe(b.id);
    expect(await stockOf(variantId)).toBe(4);
  });

  it('fusionne les lignes d’une même variante', async () => {
    const { variantId } = await createProduct({ stock: 5 });
    const zone = await createZone();
    const placed = await placeOrder(orderInput(zone.id, [{ variantId, quantity: 1 }, { variantId, quantity: 2 }]));
    const items = await prisma.orderItem.findMany({ where: { orderId: placed.id } });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('applique la meilleure promotion en cours, sans cumul, et en garde la trace', async () => {
    const { productId, variantId } = await createProduct({ price: 25000, stock: 5 });
    await createPromotion(productId, PromotionType.POURCENTAGE, 10); // 2 500
    const best = await createPromotion(productId, PromotionType.MONTANT_FIXE, 3000); // 3 000
    await createPromotion(productId, PromotionType.POURCENTAGE, 50, { expired: true }); // expirée
    const zone = await createZone(2000);

    const placed = await placeOrder(orderInput(zone.id, [{ variantId, quantity: 2 }]));
    const order = await prisma.order.findUniqueOrThrow({ where: { id: placed.id }, include: { items: true } });

    expect(order).toMatchObject({ subtotal: 50000, discountTotal: 6000, total: 46000 });
    expect(order.items[0]).toMatchObject({ unitDiscount: 3000, lineTotal: 44000, promotionId: best.id, promotionName: best.name });
  });

  it('refuse un produit non publié', async () => {
    const { variantId } = await createProduct({ publish: false });
    const zone = await createZone();
    await expect(placeOrder(orderInput(zone.id, [{ variantId, quantity: 1 }]))).rejects.toMatchObject({ code: 'PRODUCT_UNAVAILABLE' });
  });

  it('refuse une zone de livraison désactivée', async () => {
    const { variantId } = await createProduct();
    const zone = await createZone();
    await prisma.deliveryZone.update({ where: { id: zone.id }, data: { isActive: false } });
    await expect(placeOrder(orderInput(zone.id, [{ variantId, quantity: 1 }]))).rejects.toMatchObject({ code: 'DELIVERY_ZONE_UNAVAILABLE' });
  });
});

describe.runIf(HAS_DB)('commandes : la base refuse les données fausses', () => {
  async function tryRawOrder(build: (ctx: { variantId: string; productId: string; name: string }) => object) {
    const product = await createProduct({ price: 25000, stock: 5 });
    const zone = await createZone(2000);
    const customer = await testCustomer();
    return prisma.$transaction(async (tx) => {
      const data = { ...rawOrderData(zone, customer.id), ...build(product) } as Parameters<typeof tx.order.create>[0]['data'];
      const order = await tx.order.create({ data });
      return order;
    });
  }

  const line = (p: { variantId: string; productId: string; name: string }, patch: object = {}) => ({
    variantId: p.variantId,
    productId: p.productId,
    productName: p.name,
    variantLabel: '50 ml',
    unitPrice: 25000,
    unitDiscount: 0,
    quantity: 1,
    lineTotal: 25000,
    ...patch,
  });

  it('prix falsifié (MA042)', async () => {
    await expect(
      tryRawOrder((p) => ({ subtotal: 100, total: 2100, items: { create: line(p, { unitPrice: 100, lineTotal: 100 }) } })),
    ).rejects.toThrow(/\[MA042\]/);
  });

  it('remise inventée (MA044)', async () => {
    await expect(
      tryRawOrder((p) => ({ subtotal: 25000, discountTotal: 5000, total: 22000, items: { create: line(p, { unitDiscount: 5000, lineTotal: 20000 }) } })),
    ).rejects.toThrow(/\[MA04[34]\]|order_items_discount_has_promotion/);
  });

  it('variante rattachée au mauvais produit (clé étrangère composite)', async () => {
    const other = await createProduct();
    await expect(
      tryRawOrder((p) => ({ subtotal: 25000, total: 27000, items: { create: line(p, { productId: other.productId }) } })),
    ).rejects.toThrow(/\[MA043\]|order_items_variant_id_product_id_fkey/);
  });

  it('sous-total incohérent avec les lignes (MA040, au COMMIT)', async () => {
    await expect(
      tryRawOrder((p) => ({ subtotal: 30000, total: 32000, items: { create: line(p) } })),
    ).rejects.toThrow(/\[MA040\]/);
  });

  it('commande sans réservation de stock (MA040, au COMMIT)', async () => {
    await expect(
      tryRawOrder((p) => ({ subtotal: 25000, total: 27000, items: { create: line(p) } })),
    ).rejects.toThrow(/\[MA040\].*Stock non réservé/);
  });

  it('commande sans ligne (MA040)', async () => {
    await expect(tryRawOrder(() => ({ subtotal: 25000, total: 27000 }))).rejects.toThrow(/\[MA040\]/);
  });

  it('total incohérent (CHECK)', async () => {
    await expect(
      tryRawOrder((p) => ({ subtotal: 25000, total: 1, items: { create: line(p) } })),
    ).rejects.toThrow(/orders_total_consistent/);
  });

  it('commande créée dans un autre statut que EN_ATTENTE (MA030)', async () => {
    await expect(
      tryRawOrder((p) => ({ status: 'LIVREE', subtotal: 25000, total: 27000, items: { create: line(p) } })),
    ).rejects.toThrow(/\[MA030\]/);
  });

  it('téléphone non sénégalais (CHECK)', async () => {
    await expect(prisma.customer.create({ data: { name: 'X', phone: '+33612345678' } })).rejects.toThrow(/customers_phone_format/);
  });
});

describe.runIf(HAS_DB)('commandes : cycle de vie', () => {
  async function placed(stock = 5, quantity = 2) {
    const { variantId } = await createProduct({ price: 10000, stock });
    const zone = await createZone(2000);
    const order = await placeOrder(orderInput(zone.id, [{ variantId, quantity }]));
    return { orderId: order.id, variantId };
  }

  it('suit EN_ATTENTE → CONFIRMEE → EN_LIVRAISON → LIVREE, date chaque étape et historise l’admin', async () => {
    const { orderId } = await placed();
    const admin = await createAdmin();

    await changeOrderStatus(admin, orderId, OrderStatus.CONFIRMEE);
    await changeOrderStatus(admin, orderId, OrderStatus.EN_LIVRAISON);
    await changeOrderStatus(admin, orderId, OrderStatus.LIVREE);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { statusHistory: { orderBy: { createdAt: 'asc' } } } });
    expect(order.confirmedAt && order.shippedAt && order.deliveredAt).toBeTruthy();
    expect(order.statusHistory.map((h) => [h.fromStatus, h.toStatus, h.adminId])).toEqual([
      [null, 'EN_ATTENTE', null],
      ['EN_ATTENTE', 'CONFIRMEE', admin],
      ['CONFIRMEE', 'EN_LIVRAISON', admin],
      ['EN_LIVRAISON', 'LIVREE', admin],
    ]);
  });

  it('refuse un saut de statut, même en SQL direct (MA030)', async () => {
    const { orderId } = await placed();
    await expect(prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.LIVREE } })).rejects.toThrow(/\[MA030\]/);
  });

  it('annule, remet le stock en rayon, et refuse une seconde annulation', async () => {
    const { orderId, variantId } = await placed(5, 2);
    const admin = await createAdmin();
    expect(await stockOf(variantId)).toBe(3);

    await cancelOrder(admin, orderId, 'Client injoignable');
    expect(await stockOf(variantId)).toBe(5);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: OrderStatus.ANNULEE, cancelReason: 'Client injoignable' });
    expect(order.cancelledAt).not.toBeNull();

    await expect(cancelOrder(admin, orderId, 'Encore')).rejects.toBeInstanceOf(InvalidStatusTransitionError);

    // Même en contournant le service, le stock ne peut pas être libéré deux fois.
    await expect(
      prisma.$transaction((tx) => moveStock(tx, { variantId, quantity: 2, type: StockMovementType.ANNULATION, orderId })),
    ).rejects.toThrow(/stock_movements_one_release_per_line/);
    expect(await stockOf(variantId)).toBe(5);
  });

  it('refuse une annulation qui ne libère pas le stock (MA040, au COMMIT)', async () => {
    const { orderId } = await placed();
    await expect(
      prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.ANNULEE, cancelReason: 'Test' } }),
    ).rejects.toThrow(/\[MA040\]/);
  });

  it('refuse de libérer le stock d’une commande non annulée (MA040)', async () => {
    const { orderId, variantId } = await placed();
    await expect(
      prisma.$transaction((tx) => moveStock(tx, { variantId, quantity: 2, type: StockMovementType.ANNULATION, orderId })),
    ).rejects.toThrow(/\[MA040\]/);
  });

  it('exige un admin pour marquer payé, trace qui et quand', async () => {
    const { orderId } = await placed();
    await expect(prisma.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.PAYE } })).rejects.toThrow(
      /orders_paid_is_traced/,
    );

    const admin = await createAdmin();
    await markOrderPaid(admin, orderId, 'WAVE-TX-123');
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ paymentStatus: PaymentStatus.PAYE, paymentConfirmedById: admin, paymentReference: 'WAVE-TX-123' });
    expect(order.paidAt).not.toBeNull();
  });

  it('interdit d’annuler une commande payée sans remboursement', async () => {
    const { orderId } = await placed();
    const admin = await createAdmin();
    await markOrderPaid(admin, orderId);

    await expect(cancelOrder(admin, orderId, 'Rupture')).rejects.toMatchObject({ code: 'REFUND_REQUIRED' });
    await markOrderRefunded(admin, orderId);
    await cancelOrder(admin, orderId, 'Rupture');
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ status: OrderStatus.ANNULEE, paymentStatus: PaymentStatus.REMBOURSE });
    expect(order.refundedAt).not.toBeNull();
  });

  it('refuse un remboursement sans paiement (MA031)', async () => {
    const { orderId } = await placed();
    await expect(prisma.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.REMBOURSE } })).rejects.toThrow(
      /\[MA031\]/,
    );
  });

  it('ajuste les frais de livraison avec justification, en gardant le tarif d’origine', async () => {
    const { orderId } = await placed(5, 1); // 10 000 + 2 000
    await expect(prisma.order.update({ where: { id: orderId }, data: { deliveryFee: 5000, total: 15000 } })).rejects.toThrow(
      /orders_fee_change_justified/,
    );

    const admin = await createAdmin();
    await adjustDeliveryFee(admin, orderId, 5000, 'Village éloigné de Thiès');
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ defaultDeliveryFee: 2000, deliveryFee: 5000, total: 15000, deliveryFeeNote: 'Village éloigné de Thiès' });
  });

  it('fige les champs sensibles et interdit toute suppression', async () => {
    const { orderId } = await placed();
    await expect(prisma.order.update({ where: { id: orderId }, data: { subtotal: 1 } })).rejects.toThrow(/\[MA020\]/);
    await expect(prisma.orderItem.updateMany({ where: { orderId }, data: { quantity: 1 } })).rejects.toThrow(/\[MA020\]/);
    await expect(prisma.orderItem.deleteMany({ where: { orderId } })).rejects.toThrow(/\[MA020\]/);
    await expect(prisma.order.delete({ where: { id: orderId } })).rejects.toThrow(/\[MA020\]|Restrict|foreign key/i);
    await expect(prisma.orderStatusHistory.deleteMany({ where: { orderId } })).rejects.toThrow(/\[MA020\]/);
  });

  it('refuse un admin désactivé (MA060)', async () => {
    const { orderId } = await placed();
    const inactive = await createAdmin({ isActive: false });
    await expect(changeOrderStatus(inactive, orderId, OrderStatus.CONFIRMEE)).rejects.toMatchObject({ code: 'ADMIN_INACTIVE' });

    // Même en SQL direct : toute écriture auditée signée par un admin désactivé échoue.
    const { variantId } = await createProduct();
    await expect(
      prisma.$transaction(async (tx) => {
        await setAdminContext(tx, inactive);
        await tx.productVariant.update({ where: { id: variantId }, data: { price: 1000 } });
      }),
    ).rejects.toThrow(/\[MA060\]/);
    expect(await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({ status: OrderStatus.EN_ATTENTE });
  });
});
