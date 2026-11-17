/* Dad's Casino Games — offline service worker (v2).
   Same pattern as the card-games PWA, which works reliably offline:
   - Navigation requests: try the network, save the page, and fall back
     to the cached page when offline — for ANY launch URL, so the home
     screen icon always opens the game without internet.
   - Install caches the game page first; icons and the manifest are
     best-effort, so one failed download on a flaky connection can't
     kill the whole install (the old v1 failed entirely if any of its
     six files failed to download). */
const CACHE = 'dad-casino-v2';
const CRITICAL = ['./', 'index.html'];
const EXTRAS = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CRITICAL)
        .then(() => Promise.allSettled(EXTRAS.map((url) => cache.add(url)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      }))
    );
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((hit) => hit || fetch(event.request))
    );
  }
});
