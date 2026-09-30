import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dossier de compilation : permet un `next build` de vérification sans casser
  // le serveur de développement qui utilise `.next` (NEXT_DIST_DIR=.next-build).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
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
    // Cache de navigation du navigateur : revenir sur une page vue il y a moins de
    // 30 s est instantané (aucun aller-retour serveur). Les actions admin appellent
    // revalidatePath, qui vide ce cache : les données modifiées sont toujours fraîches.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
