import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

/** Étiquette du cache des référentiels : invalidée à chaque enregistrement de produit. */
export const CATALOG_OPTIONS_TAG = 'catalog-options';

export type ProductFormOptions = Awaited<ReturnType<typeof getProductFormOptions>>;

/**
 * Référentiels du formulaire produit : catégories, marques, familles, collections.
 * Ils changent rarement : mis en cache (4 requêtes économisées à chaque ouverture).
 */
export const getProductFormOptions = unstable_cache(
  async () => {
    const [categories, brands, families, collections] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, hasConcentration: true },
      }),
      prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      prisma.olfactoryFamily.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
      prisma.collection.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true },
      }),
    ]);
    return { categories, brands, families, collections };
  },
  ['product-form-options'],
  { revalidate: 300, tags: [CATALOG_OPTIONS_TAG] },
);
