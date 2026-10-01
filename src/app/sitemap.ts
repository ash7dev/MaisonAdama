import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600;

/** Plan du site pour Google : pages principales et toutes les créations publiées. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  let products: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    products = await prisma.product.findMany({
      where: { isPublished: true, isArchived: false },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (error) {
    console.error('Plan du site : produits indisponibles', error);
  }
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/boutique`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/trouver-mon-parfum`, changeFrequency: 'weekly', priority: 0.7 },
    ...['livraison-et-paiement', 'comment-commander', 'questions-frequentes'].map((slug) => ({ url: `${base}/aide/${slug}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
    ...['nouveautes', 'best-sellers', 'idees-cadeaux'].map((slug) => ({ url: `${base}/collections/${slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/produits/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
  ];
}
