import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/slug';
import { defaultVariantLabel, productInputSchema, toFieldErrors, type ProductInput } from './schemas';

const CATEGORY = '0192f0a0-0000-7000-8000-000000000001';
const IMAGE = { storagePath: 'catalog/2026/0192f0a0-0000-4000-8000-000000000009.webp', width: 800, height: 1000 };

const base = (patch: Partial<ProductInput> = {}): ProductInput => ({
  intent: 'draft',
  name: 'Oud Royal',
  categoryId: CATEGORY,
  familyIds: [],
  collectionIds: [],
  searchKeywords: [],
  variants: [{ key: 'a', size: '50', unit: 'ML', label: '50 ml', price: '25000', initialStock: '4', lowStockThreshold: '3' }],
  images: [],
  ...patch,
});

const errorsOf = (input: ProductInput) => {
  const result = productInputSchema.safeParse(input);
  return result.success ? {} : toFieldErrors(result.error);
};

describe('productInputSchema', () => {
  it('accepte un brouillon minimal et convertit les nombres saisis', () => {
    const result = productInputSchema.parse(base());
    expect(result.variants[0]).toMatchObject({ size: 50, price: 25000, initialStock: 4, lowStockThreshold: 3 });
  });

  it('exige une photo pour publier, pas pour un brouillon', () => {
    expect(errorsOf(base({ intent: 'publish' }))).toHaveProperty('images');
    expect(errorsOf(base({ intent: 'publish', images: [IMAGE] }))).toEqual({});
  });

  it('refuse deux contenances identiques et deux SKU identiques', () => {
    const variant = { key: 'x', size: '50', unit: 'ML' as const, label: '50 ml', price: '1000', initialStock: '0', lowStockThreshold: '0' };
    const errors = errorsOf(
      base({ variants: [{ ...variant, key: 'a', sku: 'OUD-50' }, { ...variant, key: 'b', sku: 'oud-50' }] }),
    );
    expect(errors['variants.1.size']).toBe('Cette contenance existe déjà.');
    expect(errors['variants.1.sku']).toBe('Référence déjà utilisée.');
  });

  it.each([
    ['prix vide', { price: '' }, 'variants.0.price'],
    ['prix à 0', { price: '0' }, 'variants.0.price'],
    ['contenance vide', { size: '' }, 'variants.0.size'],
    ['trois décimales', { size: '12.345' }, 'variants.0.size'],
    ['stock négatif', { initialStock: '-1' }, 'variants.0.initialStock'],
  ])('refuse : %s', (_label, patch, path) => {
    const variant = { ...base().variants[0], ...patch };
    expect(errorsOf(base({ variants: [variant] }))).toHaveProperty(path);
  });

  it('accepte deux décimales (contenance de 2,5 ml)', () => {
    expect(errorsOf(base({ variants: [{ ...base().variants[0], size: '2.5', label: '2,5 ml' }] }))).toEqual({});
  });

  it('accepte une photo JPEG (Safari, qui n’encode pas le WebP)', () => {
    expect(errorsOf(base({ images: [{ ...IMAGE, storagePath: IMAGE.storagePath.replace('.webp', '.jpg') }] }))).toEqual({});
  });

  it('refuse une autre extension que WebP ou JPEG', () => {
    const errors = errorsOf(base({ images: [{ ...IMAGE, storagePath: IMAGE.storagePath.replace('.webp', '.png') }] }));
    expect(errors['images.0.storagePath']).toBeDefined();
  });

  it('refuse un chemin d’image qui ne vient pas de notre envoi signé', () => {
    const errors = errorsOf(base({ images: [{ ...IMAGE, storagePath: '../../autre-bucket/x.webp' }] }));
    expect(errors['images.0.storagePath']).toBeDefined();
  });

  it('refuse un slug mal formé et dédoublonne les mots-clés', () => {
    expect(errorsOf(base({ slug: 'Oud Royal' }))).toHaveProperty('slug');
    const parsed = productInputSchema.parse(base({ searchKeywords: ['Thiouraye', 'thiouraye ', 'bakhour'] }));
    expect(parsed.searchKeywords).toEqual(['thiouraye', 'bakhour']);
  });
});

describe('defaultVariantLabel', () => {
  it.each([
    [50, 'ML', '50 ml'],
    ['2,5', 'ML', '2,5 ml'],
    [100, 'G', '100 g'],
    [1, 'UNITE', '1 pièce'],
    [3, 'UNITE', '3 pièces'],
    ['', 'ML', ''],
  ] as const)('%s %s → « %s »', (size, unit, expected) => {
    expect(defaultVariantLabel(size, unit)).toBe(expected);
  });
});

describe('slugify', () => {
  it.each([
    ['Oud Royal', 'oud-royal'],
    ['Parfum d’Exception — 50 ml', 'parfum-d-exception-50-ml'],
    ['Musc Tahara Blanc', 'musc-tahara-blanc'],
    ['Œillet & Ambre', 'oeillet-ambre'],
    ['  --Encens__Royal--  ', 'encens-royal'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
