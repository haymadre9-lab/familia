/* familia · service worker
   1. Guarda la app para que abra sin cobertura.
   2. Recibe los push de los avisos (cuando montemos la Edge Function). */

const CACHE = 'familia-v2';
const SHELL = ['./', './index.html', './estilo.css', './app.js', './manifest.json', './icono-192.png', './icono-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Nunca cachear Supabase: los datos siempre frescos.
  if (url.hostname.endsWith('supabase.co')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const red = fetch(e.request).then(r => {
        if (r.ok && url.origin === location.origin) {
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return r;
      }).catch(() => hit);
      return hit || red;
    })
  );
});

self.addEventListener('push', e => {
  let d = { title: 'Familia', body: 'Tienes un aviso' };
  try { d = e.data.json(); } catch (err) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: 'icono-192.png',
    badge: 'icono-192.png',
    tag: d.tag || 'familia',
    data: { url: d.url || './index.html' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ('focus' in w) return w.focus();
    return clients.openWindow(destino);
  }));
});
