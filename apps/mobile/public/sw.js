// Baby Names PWA — Service Worker
// Cache strategy:
//   • Static assets  → cache-first   (fast shell)
//   • API calls      → network-first (fresh data, offline fallback)
//   • Navigation     → cache-first   (app shell, SPA routing)

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `baby-names-static-${CACHE_VERSION}`;
const API_CACHE    = `baby-names-api-${CACHE_VERSION}`;
const ALL_CACHES   = [STATIC_CACHE, API_CACHE];

const PRECACHE_URLS = ['/', '/manifest.json', '/favicon.png'];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !ALL_CACHES.includes(n))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // API calls: network-first so data is always fresh when online
  const isApi =
    url.port === '3001' ||
    url.pathname.startsWith('/v1/') ||
    url.hostname.includes('api.');

  if (isApi) {
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  // App shell + static assets: cache-first
  event.respondWith(cacheFirst(event.request, STATIC_CACHE));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'You are offline', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // For navigation requests fall back to the app shell
    if (request.mode === 'navigate') {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
