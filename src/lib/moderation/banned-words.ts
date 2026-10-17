// src/lib/moderation/banned-words.ts
// Pemeriksaan kata terlarang saat konten dibuat.
//
// TUJUAN
// Menyaring konten yang jelas-jelas melanggar SEBELUM tampil, bukan setelah
// ada yang melaporkannya. Ini mengurangi beban antrean dan melindungi anggota
// dari konten yang sudah pasti tidak diinginkan.
//
// YANG TIDAK DILAKUKAN
// Tidak memblokir konten krisis. Kata seperti "bunuh diri" justru harus LOLOS
// dan masuk antrean prioritas tinggi — menyembunyikannya membuat orang yang
// butuh bantuan tidak terlihat oleh konselor.
//
// Pencocokan memakai batas kata sederhana: "anjing" tidak boleh memblokir
// "anjingku" secara keliru? Sebaliknya, "dasar anjing" harus tertangkap.
// Karena itu pola yang dipakai adalah pencarian substring untuk kata panjang
// (>= 5 huruf) dan batas kata untuk kata pendek yang rawan salah tangkap.

import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface BannedHit {
  word: string
  category: string
}

export interface ScanResult {
  /** Kata terlarang yang ditemukan. */
  hits: BannedHit[]
  /** TRUE bila konten memuat kata kunci krisis — jangan diblokir. */
  crisis: boolean
}

/**
 * Pindai teks terhadap daftar kata terlarang di database.
 *
 * Daftar diambil dari `banned_words` (hanya yang is_active). Bila tabel belum
 * ada — mis. migrasi Fase 3 belum dijalankan — fungsi mengembalikan hasil
 * kosong alih-alih menggagalkan pembuatan konten.
 */
export async function scanText(text: string): Promise<ScanResult> {
  const empty: ScanResult = { hits: [], crisis: false }
  if (!text || text.trim().length === 0) return empty

  const supabase = createClient()
  const { data, error } = await supabase
    .from('banned_words')
    .select('word, category')
    .eq('is_active', true)

  if (error || !data) return empty

  const lower = text.toLowerCase()
  const hits: BannedHit[] = []
  let crisis = false

  for (const row of data as { word: string; category: string }[]) {
    const w = row.word.trim().toLowerCase()
    if (!w) continue

    // Kata krisis TIDAK memblokir — hanya menaikkan prioritas.
    if (row.category === 'krisis') {
      if (lower.includes(w)) crisis = true
      continue
    }

    if (matches(lower, w)) hits.push({ word: row.word, category: row.category })
  }

  return { hits, crisis }
}

/**
 * Cocokkan satu kata terlarang.
 *
 * Kata pendek (<= 4 huruf) memakai batas kata agar "asu" tidak menangkap
 * "asumsi". Kata panjang memakai substring karena biasanya cukup khas.
 */
function matches(haystack: string, needle: string): boolean {
  if (needle.length <= 4) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(needle)}([^a-z0-9]|$)`, 'i')
    return re.test(haystack)
  }
  return haystack.includes(needle)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Pesan penolakan yang menyebut kata mana yang bermasalah — tanpa menampilkan
 * daftar lengkapnya (yang akan mengundang orang menguji batasnya).
 */
export function rejectionMessage(hits: BannedHit[]): string {
  const first = hits[0]
  return `Konten memuat kata yang tidak diperbolehkan (${first.category}). Mohon tulis ulang dengan bahasa yang membangun.`
}
