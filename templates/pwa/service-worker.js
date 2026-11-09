{% load static %}
const CACHE_NAME = 'norrisbeauty-desktop-v1';
const OFFLINE_SHELL = '/offline-shell/';
const PRECACHE_URLS = [
  OFFLINE_SHELL,
  "{% static 'css/norris.css' %}",
  "{% static 'css/phase2.css' %}",
  "{% static 'js/offline-vault.js' %}",
  "{% static 'js/pwa.js' %}",
  "{% static 'img/pwa-icon-192.png' %}",
  "{% static 'img/pwa-icon-512.png' %}",
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('norrisbeauty-desktop-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (
      await caches.match(OFFLINE_SHELL)
      || new Response('NorrisBeauty is offline. Reconnect and try again.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    )));
    return;
  }

  if (url.pathname.startsWith('/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
