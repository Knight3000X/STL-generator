/* Service worker for the STL generator PWA.
   The app is a single self-contained HTML (Three.js + fonts already inlined), so "offline" only needs the
   shell cached. Strategy:
     - Navigations / HTML: NETWORK-FIRST — always try the network so a fresh deploy reaches the user, and
       fall back to the cached shell only when offline. This is what lets new features show up without the
       user manually clearing the app.
     - Static assets (icons, manifest): CACHE-FIRST with a background refresh (stale-while-revalidate).
   Bump CACHE_VERSION to ship a new build (the activate step drops old caches). Only runs over http(s);
   it is never registered on file://. */
const CACHE_VERSION = 'stl-gen-v18';
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

// Is this request for an HTML document (a navigation or the generator page itself)?
function isHtmlRequest(req) {
  if (req.mode === 'navigate') return true;
  const url = new URL(req.url);
  return url.origin === self.location.origin && /\.html?$/.test(url.pathname);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // NETWORK-FIRST for HTML so fresh deploys win; cache is only the offline fallback. `cache: 'no-store'`
  // bypasses the browser's HTTP cache (GitHub Pages sends max-age=600) so a reload always pulls the very
  // latest HTML from the network, not a copy that's up to ~10 min stale.
  if (isHtmlRequest(req)) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('parametric-stl-generator.html')))
    );
    return;
  }

  // CACHE-FIRST (stale-while-revalidate) for static assets.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
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
