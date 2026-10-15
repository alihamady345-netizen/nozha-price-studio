'use strict';
// Only the offline notice is cached. Library records and application pages
// always come from the network so installed clients receive current prices/code.
const OFFLINE_CACHE = 'pricedesk-offline-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.add('/offline.html')));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(OFFLINE_CACHE).then(cache => cache.match('/offline.html'))));
  }
});
