// GO-TO 探偵団 — minimal offline cache
const CACHE = 'goto-tanteidan-v3';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg', './ogp.png',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet-heat.js', './vendor/leaflet/leaflet.markercluster.js',
  './vendor/leaflet/MarkerCluster.css', './vendor/leaflet/MarkerCluster.Default.css',
];
// タイル画像（cartocdn）は容量が際限ないためキャッシュ対象外。

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const cacheable = url.origin === self.location.origin;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        // status 200（同一オリジン/cors）または opaque（no-corsのCDNスクリプト）を保存
        if (res && cacheable && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
