// ──────────────────────────────────────────
// Ponto do Saber - Service Worker
// ──────────────────────────────────────────
// Cache name includes version for easy updates. Bumped to v2 because v1
// used cache-first for /_next/static/*, which served stale chunks in dev
// and caused an infinite reload loop (ChunkLoadError + Turbopack HMR).
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `lms-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lms-dynamic-${CACHE_VERSION}`;
const API_CACHE = `lms-api-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// ──────────────────────────────────────────
// INSTALL - Pre-cache critical assets
// ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/cursos',
        '/offline.html',
        '/manifest.json',
      ]);
    })
  );
  self.skipWaiting();
});

// ──────────────────────────────────────────
// ACTIVATE - Clean old caches
// ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('lms-') &&
              name !== STATIC_CACHE &&
              name !== DYNAMIC_CACHE &&
              name !== API_CACHE
            );
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ──────────────────────────────────────────
// FETCH - Cache strategies
// ──────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // ── API requests: Network first, fallback to cache ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // ── Static assets (JS, CSS, images): Network first ──
  // NEVER cache-first. In dev, serving chunks from cache breaks Turbopack
  // HMR (ChunkLoadError → infinite page reload). In prod, Next.js already
  // emits `public, max-age=31536000, immutable` for fingerprinted assets,
  // so the browser caches them natively; the SW only needs them for offline.
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // ── Navigation (pages): Network first with offline fallback ──
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOffline(request, DYNAMIC_CACHE));
    return;
  }

  // ── Everything else: Network first ──
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ──────────────────────────────────────────
// CACHE STRATEGIES
// ──────────────────────────────────────────

// Network First - for assets and API responses
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // JSON-ish fallback for API calls, generic 503 otherwise.
    const isApi = request.url.includes('/api/');
    return new Response(
      isApi ? JSON.stringify({ error: 'Offline' }) : 'Offline',
      {
        status: 503,
        headers: isApi ? { 'Content-Type': 'application/json' } : {},
      }
    );
  }
}

// Network First with Offline Fallback - for pages
async function networkFirstWithOffline(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ──────────────────────────────────────────
// PUSH NOTIFICATIONS
// ──────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Ponto do Saber', body: event.data?.text() || '' };
  }

  const options = {
    title: data.title || 'Ponto do Saber',
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir',
      },
      {
        action: 'close',
        title: 'Fechar',
      },
    ],
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );

  // Update clients
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        payload: data,
      });
    });
  });
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  let urlToOpen = event.notification.data?.url || '/';
  // Resolve relative URLs (e.g. "/cursos") against the SW origin, since
  // clients.openWindow requires an absolute URL.
  try {
    urlToOpen = new URL(urlToOpen, self.location.origin).href;
  } catch {
    urlToOpen = self.location.origin;
  }

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // If already open, focus it
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
