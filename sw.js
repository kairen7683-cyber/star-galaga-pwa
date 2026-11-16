const CACHE_NAME = 'strikers-1945-remastered-v3.5.0';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css?v=3.5.0',
  './game.js?v=3.5.0',
  './manifest.webmanifest',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/terrain_pacific.webp',
  './assets/terrain_fortress.webp',
  './assets/fighter_lightning_1.webp',
  './assets/fighter_lightning_2.webp',
  './assets/fighter_lightning_3.webp',
  './assets/fighter_skyray_1.webp',
  './assets/fighter_skyray_2.webp',
  './assets/fighter_skyray_3.webp',
  './assets/fighter_shinden_1.webp',
  './assets/fighter_shinden_2.webp',
  './assets/fighter_shinden_3.webp',
  './assets/drone.webp',
  './assets/bomber_b29.webp',
  './assets/enemy_scout.webp',
  './assets/enemy_supply.webp',
  './assets/enemy_gunship.webp',
  './assets/enemy_battleship.webp',
  './assets/boss1_valkyrie.webp',
  './assets/boss2_dreadnought.webp',
  './assets/boss3_leviathan.webp',
  './assets/explosion_strip.webp',
  './assets/screenshot-play.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetched = fetch(event.request)
          .then((netRes) => {
            if (netRes && netRes.status === 200) {
              const copy = netRes.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
            }
            return netRes;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
