import { describe, expect, it } from 'vitest';
import { VariantUnit } from '@prisma/client';
import { createCategory, createProduct, HAS_DB, prisma, uid } from './helpers';

describe.runIf(HAS_DB)('catalogue : invariants', () => {
  it('refuse de publier un produit sans variante active (MA050)', async () => {
    const category = await createCategory();
    const slug = `vide-${uid()}`;
    await expect(
      prisma.product.create({
        data: { name: 'Sans variante', slug, categoryId: category.id, isPublished: true, publishedAt: new Date() },
      }),
    ).rejects.toThrow(/\[MA050\]/);
  });

  it('refuse de désactiver la dernière variante d’un produit publié (MA050)', async () => {
    const { variantId } = await createProduct();
    await expect(prisma.productVariant.update({ where: { id: variantId }, data: { isActive: false } })).rejects.toThrow(/\[MA050\]/);
  });

  it('réserve la concentration aux catégories qui l’autorisent (MA051)', async () => {
    const musc = await createCategory({ hasConcentration: false });
    await expect(createProduct({ categoryId: musc.id, concentration: 'EXTRAIT' })).rejects.toThrow(/\[MA051\]/);

    const parfum = await createCategory({ hasConcentration: true });
    await createProduct({ categoryId: parfum.id, concentration: 'EXTRAIT' });
    await expect(prisma.category.update({ where: { id: parfum.id }, data: { hasConcentration: false } })).rejects.toThrow(/\[MA051\]/);
  });

  it('refuse un produit publié ET archivé, ou publié sans date', async () => {
    const { productId } = await createProduct();
    await expect(prisma.product.update({ where: { id: productId }, data: { isArchived: true } })).rejects.toThrow(
      /products_not_published_and_archived/,
    );
    await expect(prisma.product.update({ where: { id: productId }, data: { publishedAt: null } })).rejects.toThrow(
      /products_published_has_date/,
    );
  });

  it('impose des slugs propres', async () => {
    await expect(prisma.category.create({ data: { name: 'X', slug: 'Parfums Homme' } })).rejects.toThrow(/categories_slug_format/);
  });

  it('refuse un prix nul et deux variantes de même contenance', async () => {
    const { productId } = await createProduct();
    await expect(
      prisma.productVariant.create({ data: { productId, size: 30, unit: VariantUnit.ML, label: '30 ml', price: 0 } }),
    ).rejects.toThrow(/product_variants_price_positive/);
    await expect(
      prisma.productVariant.create({ data: { productId, size: 50, unit: VariantUnit.ML, label: 'Autre 50 ml', price: 1000 } }),
    ).rejects.toThrow(/Unique constraint|product_id_size_unit/);
  });
});

describe.runIf(HAS_DB)('catalogue : recherche', () => {
  async function search(term: string) {
    return prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM products
       WHERE product_search_text(name, search_keywords) LIKE '%' || normalize_search(${term}) || '%'`;
  }

  it('ignore accents et majuscules', async () => {
    const { name } = await createProduct({ name: `Oud Épicé ${uid()}` });
    expect((await search('oud epice')).map((r) => r.name)).toContain(name);
  });

  it('trouve un encens par ses synonymes (thiouraye / bakhour)', async () => {
    const { name } = await createProduct({ name: `Encens royal ${uid()}`, searchKeywords: ['thiouraye', 'bakhour'] });
    expect((await search('BAKHOUR')).map((r) => r.name)).toContain(name);
    expect((await search('thiouraye')).map((r) => r.name)).toContain(name);
  });
});
