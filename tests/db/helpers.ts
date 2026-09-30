import { randomUUID } from 'node:crypto';
import { PaymentMethod, StockMovementType, VariantUnit, type Concentration } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { PlaceOrderInput } from '@/features/checkout/schemas';

export { prisma };

/** Les tests d'intégration ne tournent que si une base de test est fournie. */
export const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);

export const uid = () => randomUUID().slice(0, 8);

/** Admin de test. Sur Supabase, crée d'abord l'utilisateur auth.users correspondant. */
export async function createAdmin(options: { isActive?: boolean } = {}): Promise<string> {
  const id = randomUUID();
  const [{ has_auth }] = await prisma.$queryRaw<{ has_auth: boolean }[]>`
    SELECT to_regclass('auth.users') IS NOT NULL AS has_auth`;
  if (has_auth) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO auth.users (id, email, aud, role) VALUES ($1::uuid, $2, 'authenticated', 'authenticated')`,
      id,
      `admin-${id}@test.local`,
    );
  }
  await prisma.adminProfile.create({ data: { id, fullName: 'Admin test', isActive: options.isActive ?? true } });
  return id;
}

export async function createCategory(options: { hasConcentration?: boolean } = {}) {
  const slug = `cat-${uid()}`;
  return prisma.category.create({
    data: { name: slug, slug, hasConcentration: options.hasConcentration ?? false },
  });
}

export async function restockRaw(variantId: string, quantity: number) {
  await prisma.$queryRaw`SELECT move_stock(${variantId}::uuid, ${quantity}::int, ${StockMovementType.REASSORT}::stock_movement_type)`;
}

/** Produit publié avec une variante (prix, stock) prête à la vente. */
export async function createProduct(
  options: {
    price?: number;
    stock?: number;
    publish?: boolean;
    name?: string;
    searchKeywords?: string[];
    concentration?: Concentration;
    categoryId?: string;
  } = {},
) {
  const categoryId = options.categoryId ?? (await createCategory({ hasConcentration: Boolean(options.concentration) })).id;
  const slug = `prod-${uid()}`;
  const product = await prisma.product.create({
    data: {
      name: options.name ?? `Parfum ${slug}`,
      slug,
      categoryId,
      concentration: options.concentration,
      searchKeywords: options.searchKeywords ?? [],
      variants: { create: { size: 50, unit: VariantUnit.ML, label: '50 ml', price: options.price ?? 25000 } },
    },
    include: { variants: true },
  });
  const variant = product.variants[0];
  if ((options.stock ?? 10) > 0) await restockRaw(variant.id, options.stock ?? 10);
  if (options.publish ?? true) {
    await prisma.product.update({ where: { id: product.id }, data: { isPublished: true, publishedAt: new Date() } });
  }
  return { productId: product.id, variantId: variant.id, categoryId, name: product.name };
}

export async function createZone(defaultFee = 2000) {
  const name = `Zone ${uid()}`;
  return prisma.deliveryZone.create({ data: { name, region: 'Dakar', defaultFee } });
}

export function orderInput(
  zoneId: string,
  items: Array<{ variantId: string; quantity: number }>,
  overrides: Partial<PlaceOrderInput> = {},
): PlaceOrderInput {
  return {
    idempotencyKey: randomUUID(),
    customerName: 'Aminata Diallo',
    customerPhone: '77 123 45 67',
    deliveryZoneId: zoneId,
    city: 'Mermoz',
    address: 'Rue 10, villa 4',
    landmark: 'En face de la pharmacie',
    paymentMethod: PaymentMethod.A_LA_LIVRAISON,
    items,
    ...overrides,
  };
}

export async function stockOf(variantId: string): Promise<number> {
  const v = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } });
  return v.stock;
}
