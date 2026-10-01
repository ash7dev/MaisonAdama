'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CATALOG_OPTIONS_TAG } from '../queries/get-product-form-options';
import { ADMIN_COUNTS_TAG } from '@/features/admin/queries';
import { SHOP_TAG } from '@/features/shop/queries';
import { requireAdmin } from '@/features/auth/require-admin';
import { isUniqueViolation, toDomainError } from '@/lib/db-errors';
import { DomainError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PRODUCT_BUCKET, PRODUCT_IMAGE_PATH, newProductImagePath } from '@/lib/supabase/storage';
import { productInputSchema, toFieldErrors, type FieldErrors } from '../schemas';
import { createProduct, ProductFieldError, type CreatedProduct } from '../services/create-product';
import { changeProductStatus, type ProductStatusChange } from '../services/product-status';
import { updateProduct } from '../services/update-product';
import { productUpdateMetaSchema } from '../schemas';
import { adjustStock, restock } from '@/features/inventory/services/adjust-stock';

export type ActionResult<T = undefined> = { ok: true; data?: T; message: string } | { ok: false; error: string };

/** Pages à rafraîchir après un changement de catalogue (liste admin, badges, boutique). */
/**
 * Un changement de catalogue touche tout le site : données en cache (étiquettes)
 * et pages pré-générées (accueil, fiches, collections). Elles sont marquées
 * périmées et se régénèrent en arrière-plan à la visite suivante.
 */
function revalidateCatalog() {
  revalidateTag(ADMIN_COUNTS_TAG); // badge « stock bas »
  revalidateTag(SHOP_TAG); // catalogue public (prix, stock, visibilité)
  revalidatePath('/', 'layout');
}

function errorMessage(error: unknown, fallback: string): string {
  const domain = toDomainError(error);
  if (domain instanceof DomainError) return domain.message;
  console.error(fallback, error);
  return fallback;
}

// -----------------------------------------------------------------------------
//  Liste des produits : visibilité et stock
// -----------------------------------------------------------------------------

const STATUS_MESSAGES: Record<ProductStatusChange, string> = {
  publish: 'Produit publié : il est visible dans la boutique.',
  unpublish: 'Produit retiré de la boutique (brouillon).',
  archive: 'Produit archivé.',
  restore: 'Produit restauré en brouillon.',
};

export async function changeProductStatusAction(productId: string, change: ProductStatusChange): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!Object.hasOwn(STATUS_MESSAGES, change)) return { ok: false, error: 'Action inconnue.' };
  try {
    await changeProductStatus(admin.id, productId, change);
    revalidateCatalog();
    return { ok: true, message: STATUS_MESSAGES[change] };
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'La modification n’a pas pu être enregistrée.') };
  }
}

export type StockAdjustment =
  | { mode: 'restock'; quantity: number; note?: string }
  | { mode: 'correction'; delta: number; note: string };

/** Réassort (+) ou correction (±, justifiée) d'une contenance ; renvoie le nouveau stock. */
export async function adjustVariantStockAction(variantId: string, adjustment: StockAdjustment): Promise<ActionResult<number>> {
  const admin = await requireAdmin();
  try {
    const stock =
      adjustment.mode === 'restock'
        ? await restock(admin.id, { variantId, quantity: adjustment.quantity, note: adjustment.note?.trim() || 'Réassort' })
        : await adjustStock(admin.id, { variantId, delta: adjustment.delta, note: adjustment.note });
    revalidateCatalog();
    return { ok: true, data: stock, message: `Stock mis à jour : ${stock}.` };
  } catch (error) {
    const domain = toDomainError(error);
    if (domain instanceof DomainError && domain.code === 'STOCK_INSUFFICIENT') {
      return { ok: false, error: 'Le stock ne peut pas devenir négatif.' };
    }
    return { ok: false, error: errorMessage(error, 'Le stock n’a pas pu être modifié.') };
  }
}

// -----------------------------------------------------------------------------
//  Photos : envoi direct navigateur → Supabase Storage, par URL signée
// -----------------------------------------------------------------------------

export type ImageUploadTicket = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

/**
 * Délivre une URL d'envoi à usage unique, pour un chemin choisi par le SERVEUR.
 * Supabase revérifie de son côté que l'utilisateur est un admin actif (RLS).
 */
export async function createProductImageUploadAction(): Promise<ImageUploadTicket> {
  await requireAdmin();
  const path = newProductImagePath(randomUUID());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('URL d’envoi refusée', error);
    return { ok: false, error: 'L’envoi de photos est momentanément indisponible.' };
  }
  return { ok: true, path: data.path, signedUrl: data.signedUrl };
}

/**
 * Supprime une photo envoyée puis retirée du formulaire avant enregistrement.
 * Refuse toute photo déjà rattachée à un produit.
 */
export async function discardProductImageAction(storagePath: string): Promise<void> {
  await requireAdmin();
  if (!PRODUCT_IMAGE_PATH.test(storagePath)) return;
  const used = await prisma.productImage.findFirst({ where: { storagePath }, select: { id: true } });
  if (used) return;
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(PRODUCT_BUCKET).remove([storagePath]);
}

// -----------------------------------------------------------------------------
//  Création du produit
// -----------------------------------------------------------------------------

export type ProductFormState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors: FieldErrors; formError?: string }
  | { status: 'success'; product: CreatedProduct };

type ErrorState = Extract<ProductFormState, { status: 'error' }>;

/** Lit et valide le formulaire ; vérifie que chaque photo existe vraiment dans le bucket. */
async function readProductForm(formData: FormData) {
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get('payload') ?? ''));
  } catch {
    return { error: { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, rechargez la page.' } as ErrorState };
  }

  const parsed = productInputSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: { status: 'error', fieldErrors: toFieldErrors(parsed.error), formError: 'Certains champs sont à corriger.' } as ErrorState,
    };
  }
  const input = parsed.data;

  if (input.images.length > 0) {
    const supabase = await createSupabaseServerClient();
    const checks = await Promise.all(
      input.images.map((image) => supabase.storage.from(PRODUCT_BUCKET).exists(image.storagePath)),
    );
    if (checks.some((check) => !check.data)) {
      return {
        error: {
          status: 'error',
          fieldErrors: { images: 'Une photo n’a pas fini de s’envoyer. Réessayez ou retirez-la.' },
          formError: 'Certaines photos sont introuvables.',
        } as ErrorState,
      };
    }
  }
  return { input };
}

/** Traduit une erreur d'enregistrement en message pour le formulaire. */
function productErrorState(error: unknown): ErrorState {
  if (error instanceof ProductFieldError) {
    const { form, ...fieldErrors } = error.fieldErrors;
    return { status: 'error', fieldErrors, formError: form ?? error.message };
  }
  if (isUniqueViolation(error, 'slug')) {
    return { status: 'error', fieldErrors: { slug: 'Cette adresse vient d’être prise, choisissez-en une autre.' } };
  }
  if (isUniqueViolation(error, 'sku')) {
    return { status: 'error', fieldErrors: { variants: 'Une référence (SKU) est déjà utilisée par un autre produit.' } };
  }
  if (isUniqueViolation(error, 'size')) {
    return {
      status: 'error',
      fieldErrors: { variants: 'Deux contenances identiques (même valeur et même unité), y compris parmi les contenances désactivées.' },
    };
  }
  const domainError = toDomainError(error);
  if (domainError instanceof DomainError) {
    return { status: 'error', fieldErrors: {}, formError: domainError.message };
  }
  console.error('Enregistrement du produit impossible', error);
  return { status: 'error', fieldErrors: {}, formError: 'Le produit n’a pas pu être enregistré. Réessayez dans un instant.' };
}

export async function createProductAction(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await requireAdmin();
  const form = await readProductForm(formData);
  if (form.error) return form.error;

  try {
    const product = await createProduct(admin.id, form.input);
    revalidateTag(CATALOG_OPTIONS_TAG); // une nouvelle marque a pu être créée
    revalidateTag(ADMIN_COUNTS_TAG); // stock initial : badge « stock bas »
    revalidatePath('/admin', 'layout');
    if (product.isPublished) revalidateCatalog();
    return { status: 'success', product };
  } catch (error) {
    return productErrorState(error);
  }
}

export async function updateProductAction(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await requireAdmin();

  let meta: unknown;
  try {
    meta = JSON.parse(String(formData.get('meta') ?? ''));
  } catch {
    meta = null;
  }
  const parsedMeta = productUpdateMetaSchema.safeParse(meta);
  if (!parsedMeta.success) return { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, rechargez la page.' };

  const form = await readProductForm(formData);
  if (form.error) return form.error;

  try {
    const { productId, expectedUpdatedAt } = parsedMeta.data;
    const product = await updateProduct(admin.id, productId, expectedUpdatedAt, form.input);
    revalidateTag(CATALOG_OPTIONS_TAG); // une nouvelle marque a pu être créée

    // Photos retirées : supprimées du stockage seulement maintenant (enregistrement validé),
    // et seulement si aucun autre produit ne les utilise.
    if (product.removedImagePaths.length > 0) {
      const stillUsed = await prisma.productImage.findMany({
        where: { storagePath: { in: product.removedImagePaths } },
        select: { storagePath: true },
      });
      const used = new Set(stillUsed.map((image) => image.storagePath));
      const orphans = product.removedImagePaths.filter((path) => !used.has(path));
      if (orphans.length > 0) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove(orphans);
        if (error) console.error('Photos retirées non supprimées du stockage', error);
      }
    }

    revalidateCatalog();
    if (product.previousSlug !== product.slug) revalidatePath(`/produits/${product.previousSlug}`);
    revalidatePath(`/admin/produits/${product.id}`);
    return {
      status: 'success',
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        categorySlug: product.categorySlug,
        isPublished: product.isPublished,
      },
    };
  } catch (error) {
    return productErrorState(error);
  }
}
