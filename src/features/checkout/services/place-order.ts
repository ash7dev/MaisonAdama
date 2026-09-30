import { prisma } from '@/lib/prisma';
import { TX_OPTIONS } from '@/lib/db-context';
import { isUniqueViolation, toDomainError } from '@/lib/db-errors';
import { DomainError, ValidationError } from '@/lib/errors';
import { reserveStockForOrder } from '@/features/inventory/services/reserve-stock';
import { sortByVariant } from '@/features/inventory/services/move-stock';
import { MAX_QUANTITY_PER_LINE, placeOrderSchema, type PlaceOrderInput } from '../schemas';

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  /** À utiliser dans l'URL de confirmation, jamais le numéro de commande. */
  publicToken: string;
  total: number;
}

interface OfferRow {
  variant_id: string;
  unit_price: number;
  unit_discount: number;
  promotion_id: string | null;
  promotion_name: string | null;
}

const ORDER_SELECT = { id: true, orderNumber: true, publicToken: true, total: true } as const;

/**
 * Crée une commande invité, réserve le stock, en une transaction.
 *
 * Le navigateur ne fournit que des identifiants et des quantités : prix,
 * remises (variant_best_offer), frais et région sont relus en base. La base
 * revérifie tout au COMMIT (montants, snapshot, stock) : un bug ici produit une
 * erreur, jamais une commande fausse.
 *
 * Idempotent : rejouer la même idempotencyKey renvoie la commande existante.
 */
export async function placeOrder(rawInput: PlaceOrderInput): Promise<PlacedOrder> {
  const parsed = placeOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError('Informations de commande invalides', parsed.error.flatten().fieldErrors);
  }
  const input = parsed.data;
  const items = mergeLines(input.items);

  try {
    return await prisma.$transaction(async (tx) => {
      const zone = await tx.deliveryZone.findFirst({
        where: { id: input.deliveryZoneId, isActive: true },
      });
      if (!zone) {
        throw new DomainError('Cette zone de livraison n’est plus desservie', 'DELIVERY_ZONE_UNAVAILABLE');
      }

      const variantIds = items.map((i) => i.variantId);
      const [variants, offers] = await Promise.all([
        tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: {
            id: true,
            label: true,
            productId: true,
            isActive: true,
            product: { select: { name: true, isPublished: true, isArchived: true } },
          },
        }),
        tx.$queryRaw<OfferRow[]>`
          SELECT v.id AS variant_id, o.unit_price, o.unit_discount, o.promotion_id, o.promotion_name
            FROM unnest(${variantIds}::uuid[]) AS v(id)
           CROSS JOIN LATERAL variant_best_offer(v.id) o`,
      ]);

      const variantById = new Map(variants.map((v) => [v.id, v]));
      const offerById = new Map(offers.map((o) => [o.variant_id, o]));

      const lines = items.map((item) => {
        const variant = variantById.get(item.variantId);
        const offer = offerById.get(item.variantId);
        if (!variant || !offer || !variant.isActive || !variant.product.isPublished || variant.product.isArchived) {
          throw new DomainError('Un article de votre panier n’est plus disponible', 'PRODUCT_UNAVAILABLE');
        }
        return {
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.product.name,
          variantLabel: variant.label,
          promotionId: offer.promotion_id,
          promotionName: offer.promotion_name,
          unitPrice: offer.unit_price,
          unitDiscount: offer.unit_discount,
          quantity: item.quantity,
          lineTotal: (offer.unit_price - offer.unit_discount) * item.quantity,
        };
      });

      const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
      const discountTotal = lines.reduce((sum, l) => sum + l.unitDiscount * l.quantity, 0);
      const deliveryFee = zone.defaultFee;

      const customer = await tx.customer.upsert({
        where: { phone: input.customerPhone },
        // L'e-mail n'écrase l'ancien que s'il est fourni.
        update: { name: input.customerName, ...(input.customerEmail ? { email: input.customerEmail } : {}) },
        create: { name: input.customerName, phone: input.customerPhone, email: input.customerEmail },
      });

      const order = await tx.order.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          customerId: customer.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          deliveryZoneId: zone.id,
          zoneName: zone.name,
          region: zone.region,
          defaultDeliveryFee: deliveryFee,
          deliveryFee,
          city: input.city,
          address: input.address,
          landmark: input.landmark,
          customerNote: input.customerNote,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
          subtotal,
          discountTotal,
          total: subtotal - discountTotal + deliveryFee,
          items: { create: lines },
        },
        select: ORDER_SELECT,
      });

      await reserveStockForOrder(tx, order.id, items);

      return order;
    }, TX_OPTIONS);
  } catch (error) {
    // Double clic / nouvel essai réseau : la commande existe déjà.
    if (isUniqueViolation(error, 'idempotency')) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: ORDER_SELECT,
      });
      if (existing) return existing;
    }
    throw toDomainError(error);
  }
}

/** Fusionne les doublons d'une même variante, puis trie (ordre de verrouillage stable). */
function mergeLines(items: Array<{ variantId: string; quantity: number }>) {
  const quantities = new Map<string, number>();
  for (const { variantId, quantity } of items) {
    quantities.set(variantId, (quantities.get(variantId) ?? 0) + quantity);
  }
  const merged = [...quantities].map(([variantId, quantity]) => ({ variantId, quantity }));
  if (merged.some((l) => l.quantity > MAX_QUANTITY_PER_LINE)) {
    throw new ValidationError(`Maximum ${MAX_QUANTITY_PER_LINE} exemplaires par article`);
  }
  return sortByVariant(merged);
}
