/* Life of P Worksheets service worker.
   Online: always fetch fresh from the site (so new worksheets show up at once) and keep a copy.
   Offline: serve the saved copy, so the app opens and every worksheet already opened still works.
   Fonts are kept after the first visit. Visitor counting and YouTube are left alone. */
const CACHE = 'lop-v1';
const SHELL = ['./', 'index.html', 'assets/app.js', 'assets/qrcode.js', 'assets/style.css',
  'data/topics.json', 'data/index.json', 'manifest.webmanifest', 'privacy.html',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/favicon-32.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// One saved copy per file: ignore ?v=… and other query strings.
const keyFor = (url) => url.origin + url.pathname;

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req.url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req.url, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) c.put(keyFor(url), res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(keyFor(url));
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match(new URL('./', self.location).href)) || (await c.match(new URL('index.html', self.location).href));
      throw err;
    }
  })());
});
