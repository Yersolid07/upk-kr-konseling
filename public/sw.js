// public/sw.js — UPK-Kr. Konseling service worker
// Strategy:
//   - Precache the app shell + offline fallback on install.
//   - Navigations: network-first, fall back to cache, then /offline.
//   - Static assets (_next/static, icons, images): stale-while-revalidate.
//   - Never cache Supabase/API/auth traffic.

const CACHE_VERSION = 'upk-kr-v1'
const PRECACHE = `${CACHE_VERSION}-precache`
const RUNTIME = `${CACHE_VERSION}-runtime`

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => null) // don't fail install on a single miss
        )
      )
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icon-') ||
    /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|css|js)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Only handle same-origin; never touch Supabase / external APIs.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Navigations -> network first, then cache, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline'))
        )
    )
    return
  }

  // Static assets -> stale-while-revalidate.
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone()
            caches.open(RUNTIME).then((cache) => cache.put(request, copy)).catch(() => {})
            return response
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
})

// Allow the page to trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
