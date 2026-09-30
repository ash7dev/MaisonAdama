import { StockMovementType } from '@prisma/client';
import { withAdmin } from '@/lib/db-context';
import { DomainError } from '@/lib/errors';
import { slugify } from '@/lib/slug';
import { moveStock } from '@/features/inventory/services/move-stock';
import type { ValidProductInput } from '../schemas';
import { ProductFieldError } from './create-product';

export type UpdatedProduct = {
  id: string;
  name: string;
  slug: string;
  previousSlug: string;
  categorySlug: string;
  isPublished: boolean;
  /** Photos retirées du produit : à supprimer du stockage APRÈS la validation. */
  removedImagePaths: string[];
};

/**
 * Met à jour un produit en UNE transaction signée (audit), sans jamais perdre
 * d'historique :
 *  - version chargée ≠ version en base → refus (modification concurrente) ;
 *  - contenance retirée : supprimée si elle n'a aucun historique, désactivée sinon ;
 *  - stock des contenances existantes : jamais modifié ici (mouvements tracés
 *    depuis la liste) ; les nouvelles contenances reçoivent leur stock initial ;
 *  - photos, familles, collections : remplacées par la nouvelle sélection.
 */
export async function updateProduct(
  adminId: string,
  productId: string,
  expectedUpdatedAt: string,
  input: ValidProductInput,
): Promise<UpdatedProduct> {
  return withAdmin(adminId, async (tx) => {
    const current = await tx.product.findUnique({
      where: { id: productId },
      select: {
        slug: true,
        isPublished: true,
        isArchived: true,
        publishedAt: true,
        updatedAt: true,
        images: { select: { storagePath: true } },
        variants: {
          select: { id: true, _count: { select: { stockMovements: true, orderItems: true } } },
        },
      },
    });
    if (!current) throw new DomainError('Ce produit n’existe plus.', 'PRODUCT_NOT_FOUND');

    if (current.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime()) {
      throw new DomainError(
        'Ce produit a été modifié entre-temps (autre appareil ou autre admin). Rechargez la page pour repartir de la dernière version.',
        'CONCURRENT_UPDATE',
      );
    }

    const publish = input.intent === 'publish';
    if (publish && current.isArchived) {
      throw new ProductFieldError({ form: 'Ce produit est archivé : restaurez-le depuis la liste avant de le publier.' });
    }

    const category = await tx.category.findFirst({
      where: { id: input.categoryId, isActive: true },
      select: { id: true, slug: true, hasConcentration: true },
    });
    if (!category) throw new ProductFieldError({ categoryId: 'Cette catégorie n’existe plus.' });
    if (input.concentration && !category.hasConcentration) {
      throw new ProductFieldError({ concentration: 'La concentration ne s’applique qu’aux parfums.' });
    }

    // Adresse : conservée tant qu'elle n'est pas modifiée volontairement (liens partagés).
    const slug = input.slug ?? current.slug;
    if (slug !== current.slug) {
      const taken = await tx.product.findFirst({ where: { slug, id: { not: productId } }, select: { id: true } });
      if (taken) throw new ProductFieldError({ slug: 'Cette adresse est déjà utilisée par un autre produit.' });
    }

    let brandId: string | null = null;
    if (input.brandName) {
      const brandSlug = slugify(input.brandName);
      if (!brandSlug) throw new ProductFieldError({ brandName: 'Nom de marque invalide.' });
      brandId = (
        await tx.brand.upsert({
          where: { slug: brandSlug },
          update: {},
          create: { name: input.brandName, slug: brandSlug },
          select: { id: true },
        })
      ).id;
    }

    // ── Contenances ────────────────────────────────────────────────────────
    const existing = new Map(current.variants.map((v) => [v.id, v._count.stockMovements + v._count.orderItems > 0]));
    const keptIds = new Set(input.variants.flatMap((v) => (v.id ? [v.id] : [])));

    for (const id of keptIds) {
      if (!existing.has(id)) throw new ProductFieldError({ variants: 'Une contenance ne correspond plus à ce produit. Rechargez la page.' });
    }

    // Retirées du formulaire : supprimées si vierges, désactivées sinon.
    for (const [id, hasHistory] of existing) {
      if (keptIds.has(id)) continue;
      if (hasHistory) await tx.productVariant.update({ where: { id }, data: { isActive: false } });
      else await tx.productVariant.delete({ where: { id } });
    }

    const newStocks: Array<{ id: string; quantity: number }> = [];
    for (const [position, variant] of input.variants.entries()) {
      const data = {
        size: variant.size,
        unit: variant.unit,
        label: variant.label,
        price: variant.price,
        lowStockThreshold: variant.lowStockThreshold,
        sku: variant.sku?.toUpperCase() ?? null,
        isActive: variant.isActive,
        position,
      };
      if (variant.id) {
        await tx.productVariant.update({ where: { id: variant.id }, data });
      } else {
        const created = await tx.productVariant.create({ data: { ...data, productId }, select: { id: true } });
        if (variant.initialStock > 0) newStocks.push({ id: created.id, quantity: variant.initialStock });
      }
    }

    // ── Photos, familles, collections : la sélection du formulaire fait foi ─
    await tx.productImage.deleteMany({ where: { productId } });
    await tx.productOlfactoryFamily.deleteMany({ where: { productId } });
    await tx.productCollection.deleteMany({ where: { productId } });

    const product = await tx.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        slug,
        categoryId: category.id,
        brandId,
        gender: input.gender ?? null,
        concentration: input.concentration ?? null,
        shortDescription: input.shortDescription ?? null,
        description: input.description ?? null,
        searchKeywords: input.searchKeywords,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        isPublished: publish,
        publishedAt: publish ? (current.publishedAt ?? new Date()) : current.publishedAt,
        images: {
          create: input.images.map((image, position) => ({
            storagePath: image.storagePath,
            alt: image.alt ?? input.name,
            width: image.width,
            height: image.height,
            position,
          })),
        },
        olfactoryFamilies: { create: input.familyIds.map((familyId) => ({ familyId })) },
        collections: { create: input.collectionIds.map((collectionId) => ({ collectionId })) },
      },
      select: { id: true, name: true, slug: true },
    });

    for (const { id, quantity } of newStocks) {
      await moveStock(tx, {
        variantId: id,
        quantity,
        type: StockMovementType.REASSORT,
        note: 'Stock initial (contenance ajoutée)',
      });
    }

    const keptPaths = new Set(input.images.map((image) => image.storagePath));
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      previousSlug: current.slug,
      categorySlug: category.slug,
      isPublished: publish,
      removedImagePaths: current.images.map((image) => image.storagePath).filter((path) => !keptPaths.has(path)),
    };
  });
}
