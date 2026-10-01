/* Service worker de la Maison Adama.
 *
 * - Fichiers du site (/_next/static) : depuis le téléphone d'abord (noms versionnés).
 * - Photos et icônes : affichées depuis le téléphone, rafraîchies en arrière-plan.
 * - Pages publiques : réseau d'abord ; hors connexion, dernière version vue,
 *   sinon la page « Hors connexion ».
 * - Jamais en cache : admin, API, commandes, panier, Server Actions (POST),
 *   requêtes vers d'autres sites.
 */
const VERSION = 'v1';
const STATIC = `ma-static-${VERSION}`;
const IMAGES = `ma-images-${VERSION}`;
const PAGES = `ma-pages-${VERSION}`;
const OFFLINE = '/hors-ligne';
const PRECACHE = [OFFLINE, '/icons/icon-192.png', '/images/logomasonAdama.jpg'];

const PRIVATE = [/^\/admin/, /^\/api\//, /^\/commande/, /^\/panier/];
const PUBLIC_PAGES = [/^\/$/, /^\/boutique/, /^\/produits\//, /^\/collections\//, /^\/aide\//, /^\/trouver-mon-parfum/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ma-') && ![STATIC, IMAGES, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Garde au plus `max` entrées (les plus anciennes partent). */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(IMAGES);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone()).then(() => trim(IMAGES, 120));
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return network;
}

async function networkFirstPage(event, url) {
  const remember = PUBLIC_PAGES.some((re) => re.test(url.pathname));
  try {
    const response = await fetch(event.request);
    if (remember && response.ok && response.type === 'basic') {
      const cache = await caches.open(PAGES);
      event.waitUntil(cache.put(event.request, response.clone()).then(() => trim(PAGES, 40)));
    }
    return response;
  } catch {
    const cached = remember ? await caches.match(event.request) : null;
    return cached || (await caches.match(OFFLINE)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // Server Actions, formulaires
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE.some((re) => re.test(url.pathname))) return;
  // Navigation interne de Next (données RSC) : toujours le réseau.
  if (request.headers.get('RSC') || url.searchParams.has('_rsc')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/')) {
    event.respondWith(staleWhileRevalidate(event));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(event, url));
  }
});
