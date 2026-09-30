import { Concentration, Gender, VariantUnit } from '@prisma/client';
import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';
import { MAX_PRODUCT_IMAGES, PRODUCT_IMAGE_PATH } from '@/lib/supabase/storage';

/**
 * Formulaire produit : UN schéma partagé par le navigateur (erreurs immédiates)
 * et par la Server Action (autorité). Les contraintes reprennent celles de la base.
 */

export const PRODUCT_LIMITS = {
  name: 160,
  shortDescription: 300,
  description: 5000,
  brandName: 80,
  seoTitle: 70,
  seoDescription: 160,
  variantLabel: 40,
  sku: 64,
  keyword: 40,
  maxKeywords: 20,
  maxVariants: 12,
  maxFamilies: 8,
  maxPrice: 10_000_000,
  maxStock: 100_000,
} as const;

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : undefined));

/** Nombre saisi dans un champ texte (« 25000 ») ou déjà numérique : converti puis validé. */
const numberish = z.union([z.number(), z.string().trim()]);

export const productVariantSchema = z.object({
  /** Identifiant local (navigateur), pour les listes React et les messages d'erreur. */
  key: z.string(),
  /** Contenance existante (modification). Absent : nouvelle contenance. */
  id: z.string().uuid().optional(),
  /** En vente ? Une contenance avec un historique se désactive au lieu d'être supprimée. */
  isActive: z.boolean().default(true),
  size: numberish.pipe(z.coerce
    .number({ invalid_type_error: 'Indiquez la contenance.' })
    .positive('La contenance doit être supérieure à 0.')
    .max(999_999, 'Contenance trop grande.')
    .refine((v) => Number.isInteger(Math.round(v * 1e6) / 1e4), 'Deux décimales au maximum.')),
  unit: z.nativeEnum(VariantUnit),
  label: z.string().trim().min(1, 'Libellé obligatoire.').max(PRODUCT_LIMITS.variantLabel, `${PRODUCT_LIMITS.variantLabel} caractères au maximum.`),
  price: numberish.pipe(
    z.coerce
      .number({ invalid_type_error: 'Indiquez le prix.' })
      .int('Prix en FCFA, sans décimale.')
      .positive('Le prix doit être supérieur à 0.')
      .max(PRODUCT_LIMITS.maxPrice, 'Prix trop élevé.'),
  ),
  initialStock: numberish.pipe(z.coerce.number().int('Nombre entier.').min(0, 'Pas de stock négatif.').max(PRODUCT_LIMITS.maxStock, 'Stock trop élevé.')),
  lowStockThreshold: numberish.pipe(z.coerce.number().int('Nombre entier.').min(0, 'Pas de seuil négatif.').max(10_000, 'Seuil trop élevé.')),
  sku: optionalText(PRODUCT_LIMITS.sku, `${PRODUCT_LIMITS.sku} caractères au maximum.`),
});

export const productImageSchema = z.object({
  storagePath: z.string().regex(PRODUCT_IMAGE_PATH, 'Image invalide.'),
  alt: optionalText(200, '200 caractères au maximum.'),
  width: z.number().int().positive().max(10_000),
  height: z.number().int().positive().max(10_000),
});

export const productInputSchema = z
  .object({
    intent: z.enum(['draft', 'publish']),
    name: z.string().trim().min(2, 'Donnez un nom au produit.').max(PRODUCT_LIMITS.name, `${PRODUCT_LIMITS.name} caractères au maximum.`),
    /** Vide : généré depuis le nom. */
    slug: z
      .string()
      .trim()
      .max(180)
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || SLUG_PATTERN.test(v), 'Lettres minuscules, chiffres et tirets uniquement.'),
    categoryId: z.string({ required_error: 'Choisissez une catégorie.' }).uuid('Choisissez une catégorie.'),
    brandName: optionalText(PRODUCT_LIMITS.brandName, `${PRODUCT_LIMITS.brandName} caractères au maximum.`),
    gender: z.nativeEnum(Gender).optional(),
    concentration: z.nativeEnum(Concentration).optional(),
    shortDescription: optionalText(PRODUCT_LIMITS.shortDescription, `${PRODUCT_LIMITS.shortDescription} caractères au maximum.`),
    description: optionalText(PRODUCT_LIMITS.description, `${PRODUCT_LIMITS.description} caractères au maximum.`),
    familyIds: z.array(z.string().uuid()).max(PRODUCT_LIMITS.maxFamilies, `${PRODUCT_LIMITS.maxFamilies} familles au maximum.`),
    collectionIds: z.array(z.string().uuid()),
    searchKeywords: z
      .array(z.string().trim().toLowerCase().min(1).max(PRODUCT_LIMITS.keyword))
      .max(PRODUCT_LIMITS.maxKeywords, `${PRODUCT_LIMITS.maxKeywords} mots-clés au maximum.`)
      .transform((list) => [...new Set(list)]),
    seoTitle: optionalText(PRODUCT_LIMITS.seoTitle, `${PRODUCT_LIMITS.seoTitle} caractères au maximum.`),
    seoDescription: optionalText(PRODUCT_LIMITS.seoDescription, `${PRODUCT_LIMITS.seoDescription} caractères au maximum.`),
    variants: z
      .array(productVariantSchema)
      .min(1, 'Ajoutez au moins une contenance avec son prix.')
      .max(PRODUCT_LIMITS.maxVariants, `${PRODUCT_LIMITS.maxVariants} contenances au maximum.`),
    images: z.array(productImageSchema).max(MAX_PRODUCT_IMAGES, `${MAX_PRODUCT_IMAGES} photos au maximum.`),
  })
  .superRefine((product, ctx) => {
    // Une contenance par (valeur, unité) : contrainte unique en base.
    const seen = new Map<string, number>();
    product.variants.forEach((variant, index) => {
      const key = `${variant.size}-${variant.unit}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['variants', index, 'size'], message: 'Cette contenance existe déjà.' });
      } else {
        seen.set(key, index);
      }
    });

    const skus = new Map<string, number>();
    product.variants.forEach((variant, index) => {
      if (!variant.sku) return;
      const sku = variant.sku.toUpperCase();
      if (skus.has(sku)) ctx.addIssue({ code: 'custom', path: ['variants', index, 'sku'], message: 'Référence déjà utilisée.' });
      skus.set(sku, index);
    });

    // Publier exige une vitrine complète ; un brouillon peut rester incomplet.
    if (product.intent === 'publish' && product.images.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['images'], message: 'Ajoutez au moins une photo pour publier.' });
    }
    if (product.intent === 'publish' && !product.variants.some((variant) => variant.isActive)) {
      ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Gardez au moins une contenance en vente pour publier.' });
    }
  });

/** Modification : le produit visé et la version chargée (détection des modifications concurrentes). */
export const productUpdateMetaSchema = z.object({
  productId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});

export type ProductInput = z.input<typeof productInputSchema>;
export type ValidProductInput = z.output<typeof productInputSchema>;
export type ProductVariantInput = z.input<typeof productVariantSchema>;

/** Erreurs à plat, indexées par chemin : "name", "variants.0.price", "images"… */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'form';
    errors[path] ??= issue.message;
  }
  return errors;
}

/** Libellé affiché par défaut : « 50 ml », « 100 g », « 1 pièce ». */
export function defaultVariantLabel(size: number | string, unit: VariantUnit): string {
  const value = typeof size === 'string' ? Number(size.replace(',', '.')) : size;
  if (!Number.isFinite(value) || value <= 0) return '';
  const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
  if (unit === VariantUnit.ML) return `${formatted} ml`;
  if (unit === VariantUnit.G) return `${formatted} g`;
  return `${formatted} ${value > 1 ? 'pièces' : 'pièce'}`;
}
