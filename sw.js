/* Guarda la app una sola vez. Solo se vuelve a descargar cuando hay versión nueva. data.enc sigue cifrado en la caché. */
const VERSION = '51c795c868bd';
const CACHE = 'cole-' + VERSION;
const ARCHIVOS = ['./', 'index.html', 'estilos.css?v=51c795c868bd', 'app.js?v=51c795c868bd', 'juegos.js?v=51c795c868bd', 'mates.js?v=51c795c868bd', 'fichas.js?v=51c795c868bd', 'topmarks.js?v=51c795c868bd', 'arte.js?v=51c795c868bd', 'clase.js?v=51c795c868bd', 'emo.js?v=51c795c868bd', 'lectura.js?v=51c795c868bd', 'mundos.js?v=51c795c868bd',  'data.enc?v=51c795c868bd', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cole-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'version') e.source.postMessage({ version: VERSION }); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== 'GET') return;
  if (url.pathname.endsWith('version.json')) return; // siempre a la red: es lo único que se consulta en cada apertura
  // Primero la copia guardada; solo va a internet si no la tiene
  e.respondWith(caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: url.pathname.endsWith('data.enc') || url.pathname.endsWith('/') })
    .then(r => r || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }))
    .catch(() => caches.match('index.html'))));
});
