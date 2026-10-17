// public/sw.js — IKA UPK-Kr FT UNSRAT service worker
// Strategy:
//   - Precache the app shell + offline fallback on install.
//   - Navigations: network-first, NEVER cache HTML. Lihat catatan di bawah.
//   - Static assets (_next/static, icons, images): stale-while-revalidate.
//   - Never cache Supabase/API/auth traffic.
//
// KENAPA HTML TIDAK BOLEH DI-CACHE
// HTML dari Next.js memuat nama chunk ber-hash (mis. page-75274913d200b515.js).
// Bila HTML lama disajikan dari cache sementara chunk lamanya sudah hilang
// setelah deploy baru, React memasang event handler pada pohon DOM yang tidak
// pernah cocok dengan komponen yang di-hidrasi. Gejalanya menyesatkan: tombol
// tampak normal, tetapi diklik tidak terjadi apa-apa — atau halaman malah
// memuat ulang. Ini pernah terjadi pada dialog keputusan moderator.
//
// Karena itu navigasi SELALU diambil dari jaringan. Cache hanya dipakai saat
// jaringan benar-benar gagal (offline), dan itulah satu-satunya saat HTML basi
// lebih baik daripada halaman kosong.

// Naikkan versi ini setiap kali aset di PRECACHE_URLS berubah isinya, supaya
// klien lama membuang cache dan mengambil berkas baru. Cache dengan prefix
// berbeda dihapus di handler 'activate'.
const CACHE_VERSION = 'ika-upk-kr-v5'
const PRECACHE = `${CACHE_VERSION}-precache`
const RUNTIME = `${CACHE_VERSION}-runtime`

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/logo-ika.png',
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
    (async () => {
      // 1. Buang cache versi lama.
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )

      // 2. Buang SELURUH respons HTML dari cache versi ini.
      //
      // Versi sebelumnya menyimpan HTML hasil navigasi. Entri itu tidak akan
      // pernah diperbarui lagi (navigasi sekarang tidak menulis cache), jadi
      // membiarkannya berarti halaman basi bisa disajikan selamanya saat
      // offline — persis kondisi yang membuat tombol admin mati. Yang boleh
      // tersisa hanya aset statis dan halaman /offline.
      for (const name of await caches.keys()) {
        if (!name.startsWith(CACHE_VERSION)) continue
        const cache = await caches.open(name)
        for (const req of await cache.keys()) {
          const url = new URL(req.url)
          const isHtmlNav =
            req.mode === 'navigate' ||
            url.pathname === '/' ||
            (!url.pathname.startsWith('/_next/static') &&
              !url.pathname.startsWith('/icon-') &&
              !/\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|css|js)$/.test(url.pathname) &&
              url.pathname !== '/offline')
          if (isHtmlNav) await cache.delete(req)
        }
      }

      await self.clients.claim()
    })()
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

  // Navigations -> SELALU jaringan. Cache hanya saat offline.
  //
  // HTML TIDAK ditulis ke cache saat berhasil. Menyimpannya berarti HTML lama
  // bisa disajikan bersama chunk ber-hash yang sudah tidak ada, dan React lalu
  // memasang handler pada DOM yang basi — tombol tampak normal tetapi mati.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
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
