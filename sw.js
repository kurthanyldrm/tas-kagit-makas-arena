// TKM Arena — network-first service worker.
// Amaç: uygulama her açıldığında (çevrimiçiyse) en güncel sürümü sunucudan çeker;
// böylece ana ekrana eklenen sürüm güncellemelerde otomatik tazelenir (silip ekleme gerekmez).
// Çevrimdışıyken son kayıtlı sürüm gösterilir.

const CACHE = "tkm-arena-cache";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  // network-first: önce ağ (en güncel), olmazsa cache (çevrimdışı)
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: "no-store" });
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (_) {
      const cached = await caches.match(req);
      return cached || (await caches.match("./index.html")) || Response.error();
    }
  })());
});
