import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/** Google visite la boutique, jamais l'administration, le panier ni la commande. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/panier', '/commande'] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
