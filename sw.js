/* Service worker for the STL generator PWA.
   The app is a single self-contained HTML (Three.js + fonts already inlined), so "offline" only needs the
   shell cached. Cache-first with a network fallback that refreshes the cache. Bump CACHE_VERSION to ship a
   new build (the activate step drops old caches). Only runs over http(s); it is never registered on file://. */
const CACHE_VERSION = 'stl-gen-v1';
const SHELL = [
  './',
  'index.html',
  'parametric-stl-generator.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
  'apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        // refresh in the background (stale-while-revalidate) for same-origin GETs
        fetch(req).then((res) => { if (res && res.ok) caches.open(CACHE_VERSION).then((c) => c.put(req, res.clone())); }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('parametric-stl-generator.html'));
    })
  );
});
