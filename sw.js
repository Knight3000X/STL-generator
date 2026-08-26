/* Service worker for the STL generator PWA.

   Приложение — один самодостаточный HTML на 2.5 МБ (Three.js и шрифты уже внутри), поэтому «офлайн»
   сводится к кэшу оболочки. Но размер решает и стратегию, и до v18.32.1 она была выбрана неверно.

   ЧТО БЫЛО. HTML шёл СЕТЬЮ-ВПЕРЁД: «всегда пробуем сеть, кэш — только офлайновый запасной». На бумаге это
   значило «свежая сборка доезжает сама». На деле, на телефоне по LTE, это два с половиной мегабайта на
   КАЖДЫЙ запуск — десять-пятнадцать секунд заставки, прежде чем покажется хоть что-нибудь. А
   поскольку `.catch` вёл в кэш, любая заминка сети отдавала кэш молча — и приложение открывалось прошлой
   сборкой, ничего об этом не сообщая. Ровно это и было снято на видео: первый запуск — v18.29.1 при
   13 КБ/с (страница пришла из кэша), второй — v18.32.0 при 200 КБ/с (вот тогда HTML и скачался).

   ЧТО СТАЛО. HTML идёт КЭШЕМ-ВПЕРЁД: запуск мгновенный и одинаковый онлайн и офлайн. Свежесть при этом не
   потеряна, а вынесена в два отдельных механизма, каждый из которых дёшев:
     1. Фоновая довычитка (stale-while-revalidate): отдав кэш, воркер тут же тянет свежую оболочку и кладёт
        её в кэш. Следующий запуск получит новую сборку, даже если sw.js не менялся ни на байт.
     2. `version.json` — несколько десятков байт, которые страница дочитывает сама (см. checkVersionOnline).
        Это и есть ответ на «а не устарел ли я»: узнать это, не качая 2.5 МБ, больше нечем. Расхождение
        версий не замалчивается: страница просит воркер обновить оболочку («refresh-shell») и, получив
        «shell-ready», перезагружается сама — если пользователь ещё ничего не трогал, — либо показывает
        полоску «Доступна новая версия».

   Статика (иконки, манифест) — кэш-вперёд с фоновым обновлением.
   Bump CACHE_VERSION вместе с APP_VERSION в parametric-stl-generator.html и version.json. Работает только
   по http(s); на file:// воркер не регистрируется вовсе. */
const CACHE_VERSION = 'stl-gen-v24.17.0';   // bump together with APP_VERSION and version.json
const SHELL = [
  './',
  'index.html',
  'parametric-stl-generator.html',
  'manifest.webmanifest',
  'version.json',
  'icon-192.png',
  'icon-512.png',
  'icon.svg',
  'apple-touch-icon.png'
];

/* Запрос СТРОИТСЯ ОТ АДРЕСА, а не от перехваченного Request, и это не стилистика. У навигационного запроса
   mode = 'navigate' и redirect = 'manual'; передать такой объект в fetch вместе с init — приглашение к
   тому, чтобы браузер отказал (историческое «Cannot construct a Request with a Request whose mode is
   navigate and a non-empty RequestInit»), а отказ здесь означал бы тихую выдачу кэша. От адреса же
   строится обычный same-origin GET, к которому никаких оговорок нет.
   `no-store` обязателен: GitHub Pages отдаёт max-age=600, и без него «свежая» копия могла бы быть на
   десять минут старее реальной. */
function freshRequest(url) {
  return new Request(url, { cache: 'no-store', credentials: 'same-origin' });
}
// Скачать ресурс заново и положить в кэш. Возвращает true, только если он действительно обновлён.
function revalidate(url) {
  return fetch(freshRequest(url)).then((res) => {
    if (!res || !res.ok) return false;
    return caches.open(CACHE_VERSION).then((c) => c.put(url, res.clone())).then(() => true);
  }).catch(() => false);
}

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

  /* `version.json` НИКОГДА не берётся из кэша: это единственный ресурс, чей смысл — сказать, что кэш
     устарел. Отдай его из кэша, и он будет вечно подтверждать сам себя. */
  if (new URL(req.url).pathname.endsWith('/version.json')) {
    e.respondWith(fetch(freshRequest(req.url)).catch(() => caches.match(req).then((hit) => hit || Response.error())));
    return;
  }

  // HTML: КЭШ-ВПЕРЁД + фоновая довычитка. Запуск мгновенный, свежая сборка приезжает в кэш к следующему.
  if (isHtmlRequest(req)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        if (hit) { e.waitUntil(revalidate(req.url)); return hit; }
        // Первый заход: кэша ещё нет, идём в сеть и заодно кладём копию.
        return fetch(freshRequest(req.url)).then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req.url, copy)); }
          return res;
        }).catch(() => caches.match('parametric-stl-generator.html'));
      })
    );
    return;
  }

  // CACHE-FIRST (stale-while-revalidate) for static assets.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) { e.waitUntil(revalidate(req.url)); return hit; }
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('parametric-stl-generator.html'));
    })
  );
});

/* «Обнови оболочку» от страницы. Нужен затем, что sw.js может не поменяться вовсе (правка только в HTML),
   а `registration.update()` в этом случае не делает ничего: воркер побайтно тот же. Здесь же перекачивается
   ровно то, из чего состоит приложение, после чего страница может перезагрузиться и получить новую сборку
   из кэша — мгновенно, без второй загрузки 2.5 МБ. */
self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type !== 'refresh-shell') return;
  e.waitUntil(Promise.all(SHELL.map(revalidate)).then((oks) => {
    const reply = { type: 'shell-ready', ok: oks.some(Boolean) };
    if (e.source && e.source.postMessage) { e.source.postMessage(reply); return; }
    return self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage(reply)));
  }));
});
