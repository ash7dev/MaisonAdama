'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export type CartLineStatus = {
  variantId: string;
  productId: string;
  slug: string;
  productName: string;
  variantLabel: string;
  categoryName: string;
  categorySlug: string;
  imagePath: string | null;
  /** Prix actuel (catalogue) et remise actuelle : même calcul que la commande. */
  unitPrice: number;
  unitDiscount: number;
  promotionName: string | null;
  stock: number;
  /** Publiée, non archivée, contenance active. */
  available: boolean;
};

const idsSchema = z.array(z.string().uuid()).max(50);

/**
 * Revérifie le panier (gardé dans le navigateur) : prix et promotions du
 * moment via variant_best_offer(), stock, disponibilité. Le client affiche
 * les écarts avant la commande ; la commande revérifie de toute façon en base.
 */
export async function validateCartAction(variantIds: string[]): Promise<CartLineStatus[]> {
  const parsed = idsSchema.safeParse([...new Set(variantIds)]);
  if (!parsed.success || parsed.data.length === 0) return [];

  const rows = await prisma.$queryRaw<
    {
      variant_id: string; product_id: string; slug: string; product_name: string; variant_label: string;
      category_name: string; category_slug: string; image_path: string | null;
      unit_price: number; unit_discount: number; promotion_name: string | null; stock: number; available: boolean;
    }[]
  >`
    SELECT v.id AS variant_id, p.id AS product_id, p.slug, p.name AS product_name, v.label AS variant_label,
           c.name AS category_name, c.slug AS category_slug,
           (SELECT storage_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY position LIMIT 1) AS image_path,
           o.unit_price, o.unit_discount, o.promotion_name, v.stock,
           (v.is_active AND p.is_published AND NOT p.is_archived) AS available
      FROM product_variants v
      JOIN products p   ON p.id = v.product_id
      JOIN categories c ON c.id = p.category_id
     CROSS JOIN LATERAL variant_best_offer(v.id) o
     WHERE v.id = ANY(${parsed.data}::uuid[])`;

  return rows.map((r) => ({
    variantId: r.variant_id,
    productId: r.product_id,
    slug: r.slug,
    productName: r.product_name,
    variantLabel: r.variant_label,
    categoryName: r.category_name,
    categorySlug: r.category_slug,
    imagePath: r.image_path,
    unitPrice: r.unit_price,
    unitDiscount: r.unit_discount,
    promotionName: r.promotion_name,
    stock: r.stock,
    available: r.available,
  }));
}
