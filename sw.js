// Planik service worker: keeps the app working offline.
// Bump VERSION on every release so phones pick up new files.
const VERSION = 'planik-v1.2.0';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/util.js', './js/store.js', './js/icons.js', './js/ui.js',
  './js/calendar.js', './js/events.js', './js/trackers.js', './js/pulse.js',
  './js/profile.js', './js/onboarding.js', './js/notify.js', './js/stories.js',
  './js/moods.js', './js/moodui.js', './js/money.js', './js/whatsnew.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.png',
  './fonts/dela-gothic-one-cyrillic-400-normal.woff2', './fonts/dela-gothic-one-latin-400-normal.woff2',
  './fonts/manrope-cyrillic-500-normal.woff2', './fonts/manrope-latin-500-normal.woff2',
  './fonts/manrope-cyrillic-600-normal.woff2', './fonts/manrope-latin-600-normal.woff2',
  './fonts/manrope-cyrillic-700-normal.woff2', './fonts/manrope-latin-700-normal.woff2',
  './fonts/manrope-cyrillic-800-normal.woff2', './fonts/manrope-latin-800-normal.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data && e.notification.data.eventId ? './#event=' + e.notification.data.eventId : './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) { c.postMessage({ open: e.notification.data }); return c.focus(); } }
      return self.clients.openWindow(target);
    })
  );
});
