const CACHE_NAME = 'project-msi-offline-v8';

const CORE_SHELL_URLS = [
  './',
  './index.html',
  './poster-original.html',
  './manifest.webmanifest',
  './favicon.svg?v=5',
  './favicon.ico?v=5',
  './apple-touch-icon.png?v=5',
  './assets/qr-project-msi.svg',
  './assets/map-full-1200w.jpg?v=8',
  './assets/map-full-2400w.jpg?v=8',
  './assets/clades/shark.svg',
  './assets/clades/teleost.svg',
  './assets/clades/amphibian.svg',
  './assets/clades/reptile.svg',
  './assets/clades/avian.svg',
  './assets/clades/mammal.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        CORE_SHELL_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {}),
        ),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('project-msi-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first with instant offline cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return (
            (await caches.match('./index.html')) ||
            (await caches.match('./'))
          );
        }),
    );
    return;
  }

  // Static assets (JS, CSS, JPG, PNG, PDF, SVG, GLB): Cache-first with background refresh
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    }),
  );
});
