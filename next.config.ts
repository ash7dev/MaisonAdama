import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dossier de compilation : permet un `next build` de vérification sans casser
  // le serveur de développement qui utilise `.next` (NEXT_DIST_DIR=.next-build).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Le service worker doit toujours être relu : une nouvelle version s'installe aussitôt.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
  images: {
    // Chaque photo envoyée a un chemin unique (UUID) : une URL ne change jamais de
    // contenu, les versions optimisées peuvent donc rester en cache 30 jours.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    // Build : une page dont la lecture en base échoue (pooler saturé) est
    // réessayée, et moins de pages sont générées en même temps.
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 4,
    // Cache de navigation du navigateur : revenir sur une page vue il y a moins de
    // 30 s est instantané (aucun aller-retour serveur). Les actions admin appellent
    // revalidatePath, qui vide ce cache : les données modifiées sont toujours fraîches.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
