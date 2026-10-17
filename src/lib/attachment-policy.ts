// src/lib/attachment-policy.ts
// Validasi lampiran yang dipakai DUA sisi:
//   - klien  (attachment-input.tsx)  -> umpan balik cepat ke pengguna
//   - server (server actions)        -> kontrol keamanan SEBENARNYA
//
// Kenapa harus di server: allowlist host embed sebelumnya HANYA ada di klien
// (parseLink di lib/uploads.ts). Klien bisa dilewati — cukup POST langsung ke
// REST API dengan `kind: 'embed'` dan `url: 'javascript:...'` atau iframe ke
// situs sembarang. Tabel attachments hanya memeriksa owner_id.
//
// Berkas ini TIDAK mengimpor apa pun dari Next/Supabase supaya bisa dipakai
// di server action maupun komponen klien tanpa risiko bundling.

import type { AttachmentKind } from '@/types/database'

/** Batas panjang judul lampiran (selaras dengan CHECK di database). */
export const MAX_TITLE_LEN = 200

/** Jenis lampiran yang boleh disematkan sebagai iframe. */
const EMBED_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'open.spotify.com',
  'drive.google.com',
  'docs.google.com',
  'www.google.com', // Google Maps embed
  'maps.google.com',
] as const

/** Host yang boleh muncul sebagai tautan biasa (kind = 'link'). */
const LINK_HOSTS = [
  ...EMBED_HOSTS,
  'healing119.id',
  'www.healing119.id',
] as const

/**
 * Host storage milik project INI.
 *
 * Sebelumnya pemeriksaannya hanya `hostname.endsWith('.supabase.co')`, yang
 * menerima project Supabase MILIK SIAPA PUN — cukup orang membuat project
 * gratis lalu menyematkan berkas dari sana. Sekarang host dibandingkan dengan
 * `NEXT_PUBLIC_SUPABASE_URL` milik aplikasi ini.
 *
 * Bila env tidak terbaca (mis. saat build tanpa env), fungsi mengembalikan
 * `false` — gagal tertutup. Lampiran yang sah akan ditolak, bukan yang asing
 * diterima.
 */
function ownStorageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!raw) return null
  try {
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isOwnStorageUrl(url: URL): boolean {
  const host = ownStorageHost()
  if (!host) return false
  return (
    url.hostname.toLowerCase() === host &&
    url.pathname.startsWith('/storage/v1/object/public/media/')
  )
}

/**
 * Validasi satu lampiran sebelum disimpan.
 * Mengembalikan pesan kesalahan (Bahasa Indonesia) atau null bila sah.
 */
export function validateAttachment(a: {
  kind: AttachmentKind
  url: string
  title?: string | null
  mime_type?: string | null
  size_bytes?: number | null
}): string | null {
  // ── Judul ──
  if (a.title != null && a.title.length > MAX_TITLE_LEN) {
    return `Judul lampiran maksimal ${MAX_TITLE_LEN} karakter.`
  }

  // ── Skema URL: WAJIB https ──
  // Ini yang menutup `javascript:`, `data:`, `vbscript:`, dan `http:` polos.
  let url: URL
  try {
    url = new URL(a.url)
  } catch {
    return 'URL lampiran tidak valid.'
  }
  if (url.protocol !== 'https:') {
    return 'Lampiran hanya boleh memakai tautan https.'
  }

  const host = url.hostname.toLowerCase()

  switch (a.kind) {
    case 'embed': {
      if (!EMBED_HOSTS.includes(host as (typeof EMBED_HOSTS)[number])) {
        return `Situs "${host}" tidak diizinkan untuk disematkan.`
      }
      return null
    }

    case 'link': {
      if (!LINK_HOSTS.includes(host as (typeof LINK_HOSTS)[number])) {
        // Tautan bebas tetap diizinkan — tetapi HANYA sebagai tautan yang
        // dibuka di tab baru, tidak pernah dirender sebagai iframe.
        return null
      }
      return null
    }

    case 'image':
    case 'video':
    case 'audio':
    case 'document': {
      // Berkas harus berasal dari storage kita sendiri.
      if (!isOwnStorageUrl(url)) {
        return 'Berkas lampiran harus diunggah lewat aplikasi.'
      }
      return null
    }

    default:
      return 'Jenis lampiran tidak dikenal.'
  }
}

/** True bila URL ini aman dirender sebagai <iframe src>. */
export function isAllowedEmbedUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:') return false
    return EMBED_HOSTS.includes(url.hostname.toLowerCase() as (typeof EMBED_HOSTS)[number])
  } catch {
    return false
  }
}

/** True bila URL ini aman dipasang pada atribut href/src media. */
export function isSafeAssetUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

export const ALLOWED_EMBED_HOSTS = EMBED_HOSTS
