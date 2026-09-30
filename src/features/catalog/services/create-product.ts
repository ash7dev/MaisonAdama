import { StockMovementType } from '@prisma/client';
import { withAdmin, type Tx } from '@/lib/db-context';
import { slugify } from '@/lib/slug';
import { moveStock } from '@/features/inventory/services/move-stock';
import type { FieldErrors, ValidProductInput } from '../schemas';

export type CreatedProduct = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  isPublished: boolean;
};

/** Erreur métier rattachée à un champ du formulaire. */
export class ProductFieldError extends Error {
  constructor(public readonly fieldErrors: FieldErrors) {
    super(Object.values(fieldErrors)[0]);
    this.name = 'ProductFieldError';
  }
}

/** Slug libre : « oud-royal », sinon « oud-royal-2 », « oud-royal-3 »… */
async function availableSlug(tx: Tx, base: string): Promise<string> {
  const taken = await tx.product.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  });
  const used = new Set(taken.map((p) => p.slug));
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * Crée un produit complet en UNE transaction signée par l'admin (audit) :
 * produit, contenances, photos, familles, collections, puis stock initial via
 * move_stock() (mouvements REASSORT tracés). Rien n'est créé si une étape échoue.
 */
export async function createProduct(adminId: string, input: ValidProductInput): Promise<CreatedProduct> {
  return withAdmin(adminId, async (tx) => {
    const category = await tx.category.findFirst({
      where: { id: input.categoryId, isActive: true },
      select: { id: true, slug: true, hasConcentration: true },
    });
    if (!category) throw new ProductFieldError({ categoryId: 'Cette catégorie n’existe plus.' });
    if (input.concentration && !category.hasConcentration) {
      throw new ProductFieldError({ concentration: 'La concentration ne s’applique qu’aux parfums.' });
    }

    // Slug : saisi → doit être libre ; sinon généré et rendu unique.
    let slug: string;
    if (input.slug) {
      const exists = await tx.product.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (exists) throw new ProductFieldError({ slug: 'Cette adresse est déjà utilisée par un autre produit.' });
      slug = input.slug;
    } else {
      const base = slugify(input.name);
      if (!base) throw new ProductFieldError({ name: 'Le nom doit contenir au moins une lettre ou un chiffre.' });
      slug = await availableSlug(tx, base);
    }

    // Marque saisie librement : réutilisée si elle existe, créée sinon.
    let brandId: string | undefined;
    if (input.brandName) {
      const brandSlug = slugify(input.brandName);
      if (!brandSlug) throw new ProductFieldError({ brandName: 'Nom de marque invalide.' });
      const brand = await tx.brand.upsert({
        where: { slug: brandSlug },
        update: {},
        create: { name: input.brandName, slug: brandSlug },
        select: { id: true },
      });
      brandId = brand.id;
    }

    const publish = input.intent === 'publish';

    const product = await tx.product.create({
      data: {
        name: input.name,
        slug,
        categoryId: category.id,
        brandId,
        gender: input.gender,
        concentration: input.concentration,
        shortDescription: input.shortDescription,
        description: input.description,
        searchKeywords: input.searchKeywords,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
        // Publié dès la création : les contraintes différées vérifient au COMMIT
        // qu'une variante active existe bien.
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
        variants: {
          create: input.variants.map((variant, position) => ({
            size: variant.size,
            unit: variant.unit,
            label: variant.label,
            price: variant.price,
            lowStockThreshold: variant.lowStockThreshold,
            sku: variant.sku?.toUpperCase(),
            isActive: variant.isActive,
            position,
          })),
        },
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
      select: { id: true, name: true, slug: true, variants: { select: { id: true, position: true } } },
    });

    // Stock initial : jamais écrit directement, toujours un mouvement tracé.
    const variantByPosition = new Map(product.variants.map((v) => [v.position, v.id]));
    for (const [position, variant] of input.variants.entries()) {
      if (variant.initialStock > 0) {
        await moveStock(tx, {
          variantId: variantByPosition.get(position)!,
          quantity: variant.initialStock,
          type: StockMovementType.REASSORT,
          note: 'Stock initial à la création du produit',
        });
      }
    }

    return { id: product.id, name: product.name, slug: product.slug, categorySlug: category.slug, isPublished: publish };
  });
}
