'use server';

import { z } from 'zod';
import { listShopProducts, type ShopProduct } from './queries';
import { SHOP_GENDERS, type ShopParams } from './params';

const answersSchema = z.object({
  pour: z.enum(SHOP_GENDERS).optional(),
  familles: z.array(z.string().regex(/^[a-z0-9-]{1,100}$/)).max(8),
  min: z.number().int().min(0).max(10_000_000).optional(),
  max: z.number().int().min(0).max(10_000_000).optional(),
});

export type PerfumeAnswers = z.input<typeof answersSchema>;
export type PerfumeSelection = { products: ShopProduct[]; total: number };

/**
 * Sélection du « conseil de la Maison » : mêmes requêtes et mêmes prix que la
 * boutique, appelée sans recharger la page. Les créations qui réunissent le
 * plus de familles choisies passent en premier.
 */
export async function findPerfumesAction(input: PerfumeAnswers, familyNames: string[]): Promise<PerfumeSelection> {
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) return { products: [], total: 0 };
  const params: ShopParams = {
    familles: parsed.data.familles,
    pour: parsed.data.pour,
    min: parsed.data.min,
    max: parsed.data.max,
    promo: false,
    tri: 'pertinence',
    page: 1,
  };
  const { products, total } = await listShopProducts(params);
  const names = familyNames.slice(0, 8);
  const score = (p: ShopProduct) => p.families.filter((f) => names.includes(f)).length;
  return { products: [...products].sort((a, b) => score(b) - score(a)).slice(0, 8), total };
}
