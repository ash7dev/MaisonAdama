import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * Produit complet pour la page de modification (null si introuvable).
 * Mis en cache pour la durée d'une requête : generateMetadata et la page le partagent.
 */
export const getProductForEdit = cache(async (id: string) => {
  // Identifiant mal formé : introuvable plutôt qu'une erreur SQL.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
      gender: true,
      concentration: true,
      shortDescription: true,
      description: true,
      searchKeywords: true,
      seoTitle: true,
      seoDescription: true,
      isPublished: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
      brand: { select: { name: true } },
      olfactoryFamilies: { select: { familyId: true } },
      collections: { select: { collectionId: true } },
      images: { orderBy: { position: 'asc' }, select: { storagePath: true, alt: true, width: true, height: true } },
      variants: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          size: true,
          unit: true,
          label: true,
          price: true,
          stock: true,
          lowStockThreshold: true,
          sku: true,
          isActive: true,
          _count: { select: { stockMovements: true, orderItems: true } },
        },
      },
    },
  });
  if (!product) return null;

  return {
    ...product,
    brandName: product.brand?.name ?? '',
    familyIds: product.olfactoryFamilies.map((f) => f.familyId),
    collectionIds: product.collections.map((c) => c.collectionId),
    variants: product.variants.map(({ _count, size, ...variant }) => ({
      ...variant,
      size: size.toString(), // Decimal → texte (sérialisable vers le navigateur)
      hasHistory: _count.stockMovements + _count.orderItems > 0,
    })),
    updatedAt: product.updatedAt.toISOString(),
    createdAt: product.createdAt.toISOString(),
  };
});

export type ProductForEdit = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;
