import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { productImageUrl } from '@/lib/supabase/storage';
import { siteConfig } from '@/config/site';

/**
 * Données d'une story produit : tout est relu en base (prix réel, promotion
 * en cours et sa date de fin, familles), et la photo est préparée par sharp
 * (orientation corrigée, JPEG haute qualité). Jamais d'agrandissement au-delà
 * de ce que la photo permet : les gabarits reçoivent sa taille réelle.
 */

export { STORY_TEMPLATES, TEMPLATE_LABELS, type StoryTemplate } from './meta';
import type { StoryTemplate } from './meta';

/** Agrandissement maximal toléré d'une photo (au-delà, elle perdrait sa netteté). */
export const MAX_UPSCALE = 1.25;

const GENDER: Record<string, string> = { HOMME: 'Homme', FEMME: 'Femme', UNISEXE: 'Mixte' };
const CONCENTRATION: Record<string, string> = { EAU_DE_TOILETTE: 'Eau de toilette', EAU_DE_PARFUM: 'Eau de parfum', EXTRAIT: 'Extrait de parfum' };
const NEW_DAYS = 30;

export type StoryPhoto = { src: string; width: number; height: number };

export type StoryData = {
  slug: string;
  name: string;
  /** « Eau de toilette · Mixte » ou l'univers. */
  kind: string;
  families: string[];
  tagline: string | null;
  price: number;
  /** Prix barré si une promotion est en cours. */
  was: number | null;
  percent: number | null;
  promoEndsAt: Date | null;
  /** « dès » : plusieurs contenances à des prix différents. */
  fromRange: boolean;
  isNew: boolean;
  publishedAt: Date | null;
  url: string;
  photo: StoryPhoto | null;
};

type Row = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  concentration: string | null;
  gender: string | null;
  published_at: Date | null;
  category_name: string;
  families: string[];
  images: string[];
};

type Offer = { price: number; discount: number; ends_at: Date | null };

export async function getStoryProduct(slug: string) {
  const [row] = await prisma.$queryRaw<Row[]>`
    SELECT p.id, p.name, p.slug, p.short_description, p.concentration::text AS concentration,
           p.gender::text AS gender, p.published_at, c.name AS category_name,
           coalesce((SELECT array_agg(f.name ORDER BY f.position, f.name)
                       FROM product_olfactory_families pf JOIN olfactory_families f ON f.id = pf.family_id
                      WHERE pf.product_id = p.id), '{}') AS families,
           coalesce((SELECT array_agg(i.storage_path ORDER BY i.position)
                       FROM product_images i WHERE i.product_id = p.id), '{}') AS images
      FROM products p
      JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ${slug} AND p.is_published AND NOT p.is_archived`;
  if (!row) return null;

  const offers = await prisma.$queryRaw<Offer[]>`
    SELECT o.unit_price AS price, o.unit_discount AS discount, pr.ends_at
      FROM product_variants v
     CROSS JOIN LATERAL variant_best_offer(v.id) o
      LEFT JOIN promotions pr ON pr.id = o.promotion_id
     WHERE v.product_id = ${row.id}::uuid AND v.is_active`;
  return { row, offers };
}

/** Ce que l'admin peut choisir : modèles disponibles, photos et leur netteté possible. */
export async function getStoryOptions(slug: string) {
  const found = await getStoryProduct(slug);
  if (!found) return null;
  const { row, offers } = found;
  const promo = offers.some((o) => o.discount > 0);
  const isNew = row.published_at ? Date.now() - row.published_at.getTime() < NEW_DAYS * 86_400_000 : false;
  return { slug: row.slug, name: row.name, photos: row.images.length, promo, isNew };
}

/** Prépare la photo n° `index` (orientation, JPEG), avec sa taille réelle. */
async function loadPhoto(path: string | undefined): Promise<StoryPhoto | null> {
  const url = productImageUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const image = sharp(input).rotate();
    const { width = 0, height = 0 } = await image.metadata();
    // Grandes photos : réduites à 1600 px (la story fait 1080 de large), jamais agrandies.
    const out = await image.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    return { src: `data:image/jpeg;base64,${out.data.toString('base64')}`, width: out.info.width || width, height: out.info.height || height };
  } catch {
    return null;
  }
}

export async function getStoryData(slug: string, photoIndex = 0): Promise<StoryData | null> {
  const found = await getStoryProduct(slug);
  if (!found) return null;
  const { row, offers } = found;

  const finals = offers.map((o) => ({ ...o, final: o.price - o.discount, pct: o.discount > 0 ? Math.round((100 * o.discount) / o.price) : 0 }));
  const promo = [...finals].sort((a, b) => b.pct - a.pct || a.final - b.final).find((o) => o.pct > 0) ?? null;
  const cheapest = [...finals].sort((a, b) => a.final - b.final)[0];
  const price = promo ? promo.final : cheapest?.final ?? 0;
  const fromRange = !promo && new Set(finals.map((o) => o.final)).size > 1;

  const kind = [row.concentration ? CONCENTRATION[row.concentration] : row.category_name, row.gender ? GENDER[row.gender] : null].filter(Boolean).join(' · ');
  // « Dolores — Élégance, douceur et sensualité » → « Élégance, douceur et sensualité »
  const tagline = row.short_description?.split(/\s+[—–-]\s+/).slice(-1)[0]?.trim() || null;
  const index = Math.min(Math.max(0, photoIndex), Math.max(0, row.images.length - 1));

  return {
    slug: row.slug,
    name: row.name,
    kind,
    families: row.families,
    tagline: tagline && tagline !== row.short_description ? tagline : row.short_description,
    price,
    was: promo ? promo.price : null,
    percent: promo ? promo.pct : null,
    promoEndsAt: promo?.ends_at ?? null,
    fromRange,
    isNew: row.published_at ? Date.now() - row.published_at.getTime() < NEW_DAYS * 86_400_000 : false,
    publishedAt: row.published_at,
    url: `${siteConfig.url.replace(/\/$/, '')}/produits/${row.slug}?source=story`,
    photo: await loadPhoto(row.images[index]),
  };
}
