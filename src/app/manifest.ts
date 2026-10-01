import type { MetadataRoute } from 'next';

/**
 * Application installable (Android, iOS, ordinateur) : nom, couleurs et icônes
 * (le logo de la Maison). Servi à /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Maison Adama Tchurayy',
    short_name: 'Maison Adama',
    description: 'Parfums, muscs, huiles, oud et thiouraye, choisis et préparés à Dakar.',
    lang: 'fr-SN',
    dir: 'ltr',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F1E9DB',
    theme_color: '#F1E9DB',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Appui long sur l'icône (Android) : accès directs.
    shortcuts: [
      { name: 'La Boutique', short_name: 'Boutique', url: '/boutique?source=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Trouver mon parfum', short_name: 'Mon parfum', url: '/trouver-mon-parfum?source=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Mon panier', short_name: 'Panier', url: '/panier?source=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
