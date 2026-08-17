// Service worker (PWA-оболочка). Приложение — один HTML на 2.5 МБ, поэтому стратегия кэша решает не
// «удобство офлайна», а то, КАКУЮ СБОРКУ пользователь увидит при запуске. До v18.32.1 она была выбрана
// неверно: HTML шёл сетью-вперёд, а `.catch` вёл в кэш, и любая заминка сети отдавала прошлую сборку
// МОЛЧА. На видео это выглядело так: первый запуск — v18.29.1 при 13 КБ/с, второй — v18.32.0 при 200 КБ/с.
//
// Ни одна геометрическая проверка такого поймать не может, поэтому здесь sw.js запускается в поддельной
// среде воркера: свои `caches`, `fetch`, `Request`, `Response`, регистрация слушателей. Проверяется
// поведение, а не текст файла. Запускается сам по себе: `node test_sw.js` (и через ./run-all.sh).
'use strict';
const fs = require('fs');
let pass = 0, fail = 0;
function chk(name, cond, extra){ if(cond){ pass++; console.log('  OK  ', name); }
  else { fail++; console.log('  FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } }

/* ---- поддельная среда воркера ------------------------------------------------------------------- */
const ORIGIN = 'https://example.test';
const BASE = ORIGIN + '/app/';

class FakeResponse {
  constructor(body, init){ this.body = body; init = init || {};
    this.status = init.status === undefined ? 200 : init.status;
    this.ok = this.status >= 200 && this.status < 300; }
  clone(){ return new FakeResponse(this.body, { status: this.status }); }
}
FakeResponse.error = () => new FakeResponse(null, { status: 0 });

class FakeRequest {
  constructor(input, init){
    init = init || {};
    if (input instanceof FakeRequest){
      /* ТОТ САМЫЙ УГОЛ, из-за которого сеть могла молча не сработать: браузеры не дают строить запрос из
         НАВИГАЦИОННОГО Request с непустым init. Подделка ведёт себя так же — значит код, который так
         делает, здесь падает, а не «иногда падает у пользователя». */
      if (Object.keys(init).length && input.mode === 'navigate')
        throw new TypeError("Cannot construct a Request with a Request whose mode is 'navigate' and a non-empty RequestInit");
      this.url = input.url; this.mode = input.mode; this.method = input.method;
    } else { this.url = String(input); this.mode = init.mode || 'cors'; this.method = init.method || 'GET'; }
    if (this.url.indexOf('://') < 0) this.url = new URL(this.url, BASE).href;
    this.cache = init.cache || 'default';
    this.credentials = init.credentials || 'same-origin';
  }
}
function navRequest(url){ const r = new FakeRequest(url); r.mode = 'navigate'; return r; }

class FakeCache {
  constructor(){ this.map = new Map(); }
  addAll(urls){ return Promise.all(urls.map((u) => env.fetch(new FakeRequest(u))
    .then((res) => { if(!res || !res.ok) throw new Error('addAll ' + u); this.map.set(abs(u), res.body); }))); }
  put(reqOrUrl, res){ this.map.set(abs(typeof reqOrUrl === 'string' ? reqOrUrl : reqOrUrl.url), res.body); return Promise.resolve(); }
  match(reqOrUrl){ const k = abs(typeof reqOrUrl === 'string' ? reqOrUrl : reqOrUrl.url);
    return Promise.resolve(this.map.has(k) ? new FakeResponse(this.map.get(k)) : undefined); }
}
function abs(u){ return u.indexOf('://') < 0 ? new URL(u, BASE).href : u; }

const env = {
  caches: null, fetch: null, listeners: {}, waits: [], clients: [], claimed: false, skipped: false,
};
class FakeCacheStorage {
  constructor(){ this.stores = new Map(); }
  open(name){ if(!this.stores.has(name)) this.stores.set(name, new FakeCache()); return Promise.resolve(this.stores.get(name)); }
  keys(){ return Promise.resolve([...this.stores.keys()]); }
  delete(name){ return Promise.resolve(this.stores.delete(name)); }
  match(req){ const hits = [...this.stores.values()].map((c) => c.map.get(abs(typeof req === 'string' ? req : req.url)));
    const hit = hits.find((h) => h !== undefined);
    return Promise.resolve(hit === undefined ? undefined : new FakeResponse(hit)); }
}

// Сервер: что лежит на «сервере» сейчас. Меняя его, играем в выкатку новой сборки.
let SERVER, netCalls, offline;
function resetServer(version){
  SERVER = {
    './': 'index@' + version,
    'index.html': 'index@' + version,
    'parametric-stl-generator.html': 'app@' + version,
    'manifest.webmanifest': 'manifest@' + version,
    'version.json': JSON.stringify({ version: version }),
    'icon-192.png': 'i192', 'icon-512.png': 'i512', 'icon.svg': 'isvg', 'apple-touch-icon.png': 'ati',
  };
  netCalls = []; offline = false;
}

function loadWorker(){
  const src = fs.readFileSync('sw.js', 'utf8');
  const self = {
    addEventListener: (t, fn) => { (env.listeners[t] = env.listeners[t] || []).push(fn); },
    skipWaiting: () => { env.skipped = true; return Promise.resolve(); },
    clients: { claim: () => { env.claimed = true; return Promise.resolve(); },
               matchAll: () => Promise.resolve(env.clients) },
    location: { origin: ORIGIN, href: BASE + 'sw.js' },
  };
  const fetchImpl = (req) => {
    const r = (req instanceof FakeRequest) ? req : new FakeRequest(req);
    netCalls.push({ url: r.url, cache: r.cache, mode: r.mode });
    if (offline) return Promise.reject(new TypeError('offline'));
    const rel = r.url.slice(BASE.length).replace(/\?.*$/, '') || './';
    const body = SERVER[rel] !== undefined ? SERVER[rel] : (rel === '' ? SERVER['./'] : undefined);
    return Promise.resolve(body === undefined ? new FakeResponse(null, { status: 404 }) : new FakeResponse(body));
  };
  env.fetch = fetchImpl;
  const fn = new Function('self', 'caches', 'fetch', 'Request', 'Response', 'URL', 'console', src);
  fn(self, env.caches, fetchImpl, FakeRequest, FakeResponse, URL, console);
}

function fire(type, event){ return Promise.all((env.listeners[type] || []).map((fn) => {
  const waits = [];
  const e = Object.assign({ waitUntil: (p) => waits.push(p), respondWith: (p) => { e.__res = p; } }, event);
  fn(e);
  return Promise.all(waits).then(() => e.__res);
})).then((rs) => rs[0]); }

function boot(version){
  resetServer(version);
  env.caches = new FakeCacheStorage(); env.listeners = {}; env.clients = [];
  loadWorker();
  return fire('install').then(() => fire('activate'));
}
const navFetch = (url) => fire('fetch', { request: navRequest(url) }).then((p) => p);
const settle = () => new Promise((r) => setTimeout(r, 0));

/* ---- проверки ------------------------------------------------------------------------------------ */
(async function run(){
  console.log('=== установка кладёт оболочку в кэш ===');
  await boot('v1.0.0');
  chk('skipWaiting и claim вызваны', env.skipped && env.claimed);
  const cacheName = (await env.caches.keys())[0];
  chk('кэш один и он именованный по версии', /^stl-gen-v/.test(cacheName), cacheName);
  const c = await env.caches.open(cacheName);
  chk('в кэше лежит сама страница', c.map.get(abs('parametric-stl-generator.html')) === 'app@v1.0.0');
  chk('и version.json — иначе офлайн его нечем открыть', c.map.has(abs('version.json')));

  console.log('=== запуск отдаётся из кэша: мгновенно, без 2.5 МБ ===');
  {
    netCalls = [];
    const res = await navFetch('parametric-stl-generator.html');
    chk('страница пришла из кэша', res && res.body === 'app@v1.0.0', res && res.body);
    await settle();
    /* И ТУТ ЖЕ ДОВЫЧИТАНА. Без этого кэш обновлялся бы только при смене sw.js — то есть приложение
       осталось бы «на одну сборку позади» ровно так же, как и было. */
    const fresh = netCalls.filter((n) => n.url.endsWith('parametric-stl-generator.html'));
    chk('и следом ушла фоновая довычитка', fresh.length === 1, netCalls.map((n) => n.url));
    chk('довычитка идёт мимо HTTP-кэша (no-store)', fresh[0] && fresh[0].cache === 'no-store', fresh[0]);
    chk('и НЕ навигационным запросом — иначе браузер вправе отказать',
        fresh[0] && fresh[0].mode !== 'navigate', fresh[0]);
  }

  console.log('=== выкатили новую сборку ===');
  {
    SERVER['parametric-stl-generator.html'] = 'app@v2.0.0';
    SERVER['version.json'] = JSON.stringify({ version: 'v2.0.0' });
    const first = await navFetch('parametric-stl-generator.html');
    chk('первый запуск ещё старый — так и задумано, зато мгновенный', first.body === 'app@v1.0.0');
    await settle();
    const second = await navFetch('parametric-stl-generator.html');
    chk('а следующий уже новый: довычитка положила его в кэш', second.body === 'app@v2.0.0', second.body);
  }

  console.log('=== version.json никогда не берётся из кэша ===');
  {
    await boot('v1.0.0');
    SERVER['version.json'] = JSON.stringify({ version: 'v9.9.9' });
    netCalls = [];
    const res = await fire('fetch', { request: new FakeRequest('version.json') });
    chk('отдан свежий, а не тот, что лежит в кэше', JSON.parse(res.body).version === 'v9.9.9', res.body);
    chk('и запрошен с no-store', netCalls.length === 1 && netCalls[0].cache === 'no-store', netCalls);
    offline = true;
    const off = await fire('fetch', { request: new FakeRequest('version.json') });
    chk('офлайн — падает обратно в кэш, а не в ошибку', off && off.body !== null && off.body !== undefined, off && off.body);
    offline = false;
  }

  console.log('=== офлайн ===');
  {
    await boot('v1.0.0');
    offline = true;
    const res = await navFetch('parametric-stl-generator.html');
    chk('страница открывается из кэша', res.body === 'app@v1.0.0');
    const other = await navFetch('cовсем-другой-адрес.html');
    chk('и любая навигация уводит на оболочку, а не в ошибку', other && other.body === 'app@v1.0.0', other && other.body);
    offline = false;
  }

  console.log('=== «обнови оболочку» от страницы ===');
  {
    await boot('v1.0.0');
    SERVER['parametric-stl-generator.html'] = 'app@v3.0.0';
    const replies = [];
    await fire('message', { data: { type: 'refresh-shell' }, source: { postMessage: (m) => replies.push(m) } });
    chk('воркер ответил, что оболочка готова', replies.length === 1 && replies[0].type === 'shell-ready', replies);
    const cc = await env.caches.open((await env.caches.keys())[0]);
    chk('и в кэше уже новая сборка', cc.map.get(abs('parametric-stl-generator.html')) === 'app@v3.0.0');
    const res = await navFetch('parametric-stl-generator.html');
    chk('перезагрузка после этого отдаёт новую', res.body === 'app@v3.0.0', res.body);
    /* Ответ обязателен даже когда сеть легла: страница ждёт «shell-ready», чтобы перезагрузиться, и
       молчание оставило бы её висеть с полоской, которая ничего не делает. */
    offline = true;
    const r2 = [];
    await fire('message', { data: { type: 'refresh-shell' }, source: { postMessage: (m) => r2.push(m) } });
    chk('офлайн он отвечает тоже — но честным ok:false', r2.length === 1 && r2[0].ok === false, r2);
    offline = false;
  }

  console.log('=== старые кэши сносятся ===');
  {
    await boot('v1.0.0');
    const old = await env.caches.open('stl-gen-v0.0.1');
    old.map.set(abs('parametric-stl-generator.html'), 'ветхое');
    await fire('activate');
    chk('после активации остался один кэш', (await env.caches.keys()).length === 1, await env.caches.keys());
  }

  console.log('=== POST не перехватывается ===');
  {
    await boot('v1.0.0');
    const res = await fire('fetch', { request: new FakeRequest('parametric-stl-generator.html', { method: 'POST' }) });
    chk('воркер в него не вмешивается', res === undefined, res && res.body);
  }

  console.log('\n=== TOTAL:', pass, 'passed,', fail, 'failed ===');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('  FAIL  упало:', e && e.stack || e); process.exit(1); });
