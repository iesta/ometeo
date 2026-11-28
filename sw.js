const V = 'ometeo-v8';
const SHELL = ['./', './index.html', './styles.css', './app.js', './icon.svg', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // APIs et polices : réseau direct

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(V).then((c) => c.put('./index.html', copy));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // stale-while-revalidate
  e.respondWith(
    caches.open(V).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req)
        .then((r) => {
          if (r.ok) c.put(req, r.clone());
          return r;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
