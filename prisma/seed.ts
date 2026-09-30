// =============================================================================
//  Maison Adama — données de référence (idempotent : relançable sans doublon)
//
//    npm run db:seed                 → référentiels (catégories, familles, zones…)
//    SEED_DEMO=1 npm run db:seed     → + un produit de démonstration par catégorie
//
//  Les tarifs de livraison sont PROVISOIRES (point 5 à valider avec le vendeur).
// =============================================================================

import { PrismaClient, StockMovementType, VariantUnit, type Concentration, type Gender } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'parfums', name: 'Parfums', hasConcentration: true, position: 1 },
  { slug: 'muscs', name: 'Muscs', hasConcentration: false, position: 2 },
  { slug: 'huiles', name: 'Huiles', hasConcentration: false, position: 3 },
  { slug: 'oud', name: 'Oud', hasConcentration: false, position: 4 },
  { slug: 'encens', name: 'Encens (thiouraye)', hasConcentration: false, position: 5 },
];

const OLFACTORY_FAMILIES = ['Boisé', 'Floral', 'Oriental', 'Fruité', 'Épicé', 'Musqué', 'Ambré', 'Frais'];

const COLLECTIONS = [
  { slug: 'nouveautes', name: 'Nouveautés', position: 1 },
  { slug: 'best-sellers', name: 'Best-sellers', position: 2 },
  { slug: 'idees-cadeaux', name: 'Idées cadeaux', position: 3 },
];

// Provisoire : à confirmer avec le vendeur avant la mise en ligne.
const DELIVERY_ZONES = [
  { name: 'Dakar', region: 'Dakar', defaultFee: 2000, estimatedDelay: '24 h', position: 1 },
  { name: 'Thiès', region: 'Thiès', defaultFee: 3500, estimatedDelay: '48 h', position: 2 },
  { name: 'Touba / Mbacké', region: 'Diourbel', defaultFee: 4000, estimatedDelay: '48–72 h', position: 3 },
  { name: 'Saint-Louis', region: 'Saint-Louis', defaultFee: 4000, estimatedDelay: '48–72 h', position: 4 },
];

type DemoProduct = {
  slug: string;
  name: string;
  category: string;
  gender?: Gender;
  concentration?: Concentration;
  searchKeywords?: string[];
  families: string[];
  variants: Array<{ size: number; unit: VariantUnit; label: string; price: number; stock: number }>;
};

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: 'demo-eau-de-parfum-ambre',
    name: 'Démo — Eau de parfum Ambre',
    category: 'parfums',
    gender: 'UNISEXE',
    concentration: 'EAU_DE_PARFUM',
    families: ['Ambré', 'Oriental'],
    variants: [
      { size: 50, unit: VariantUnit.ML, label: '50 ml', price: 25000, stock: 10 },
      { size: 100, unit: VariantUnit.ML, label: '100 ml', price: 40000, stock: 5 },
    ],
  },
  {
    slug: 'demo-musc-blanc',
    name: 'Démo — Musc blanc',
    category: 'muscs',
    families: ['Musqué'],
    variants: [{ size: 12, unit: VariantUnit.ML, label: '12 ml', price: 5000, stock: 20 }],
  },
  {
    slug: 'demo-thiouraye-royal',
    name: 'Démo — Thiouraye royal',
    category: 'encens',
    searchKeywords: ['thiouraye', 'bakhour', 'encens'],
    families: ['Boisé', 'Épicé'],
    variants: [{ size: 100, unit: VariantUnit.G, label: 'Pot 100 g', price: 7500, stock: 15 }],
  },
];

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Référentiel du catalogue : catégories, familles olfactives, collections. */
async function seedCatalog() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { hasConcentration: c.hasConcentration },
      create: c,
    });
  }

  for (const [index, name] of OLFACTORY_FAMILIES.entries()) {
    await prisma.olfactoryFamily.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), position: index + 1 },
    });
  }

  for (const c of COLLECTIONS) {
    await prisma.collection.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
}

/** Zones de livraison (tarifs PROVISOIRES) et paramètres de la boutique. */
async function seedStore() {
  // update vide : on ne réécrase jamais un tarif modifié depuis l'admin.
  for (const z of DELIVERY_ZONES) {
    await prisma.deliveryZone.upsert({ where: { name: z.name }, update: {}, create: z });
  }

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: 'Maison Adama Tchurayy',
      whatsappNumber: '+221771059210',
      contactPhone: '+221771059210',
    },
  });
}

async function seedDemoProducts() {
  const categories = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const families = new Map((await prisma.olfactoryFamily.findMany()).map((f) => [f.name, f.id]));

  for (const demo of DEMO_PRODUCTS) {
    if (await prisma.product.findUnique({ where: { slug: demo.slug } })) continue;

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug: demo.slug,
          name: demo.name,
          categoryId: categories.get(demo.category)!,
          gender: demo.gender,
          concentration: demo.concentration,
          searchKeywords: demo.searchKeywords ?? [],
          olfactoryFamilies: { create: demo.families.map((name) => ({ familyId: families.get(name)! })) },
          // Le stock initial passe par move_stock() (REASSORT) : jamais écrit directement.
          variants: {
            create: demo.variants.map(({ stock: _stock, ...v }, position) => ({ ...v, position })),
          },
        },
        include: { variants: true },
      });

      for (const variant of product.variants) {
        const stock = demo.variants.find((v) => v.label === variant.label)!.stock;
        await tx.$queryRaw`SELECT move_stock(${variant.id}::uuid, ${stock}::int, ${StockMovementType.REASSORT}::stock_movement_type, NULL, 'Stock initial (démo)')`;
      }

      await tx.product.update({
        where: { id: product.id },
        data: { isPublished: true, publishedAt: new Date() },
      });
    });
  }
}

/**
 * SEED_SCOPE=catalog : uniquement le référentiel du catalogue (sans les tarifs de
 * livraison, à valider avec le vendeur). Par défaut : tout.
 */
async function main() {
  const catalogOnly = process.env.SEED_SCOPE === 'catalog';
  await seedCatalog();
  if (!catalogOnly) await seedStore();
  if (process.env.SEED_DEMO === '1') await seedDemoProducts();
  console.log(
    `Seed terminé : ${catalogOnly ? 'catalogue uniquement' : 'catalogue et boutique'}${process.env.SEED_DEMO === '1' ? ', avec produits de démonstration' : ''}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
