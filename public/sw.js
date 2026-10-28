// Service worker simples: páginas e assets ficam em cache para abrir offline.
const CACHE = 'ezpeak-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Assets com hash: cache primeiro. Páginas: rede primeiro, cache se offline.
  const assetFirst = url.pathname.startsWith('/_next/static/') || url.pathname.endsWith('.svg');
  e.respondWith(
    (assetFirst ? caches.match(req) : Promise.resolve(undefined)).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => caches.match(req)),
    ),
  );
});
