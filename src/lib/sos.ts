// src/lib/sos.ts
// Nomor WhatsApp konselor piket — satu sumber, dua jalur.
//
// MASALAH YANG DIPERBAIKI
// Tombol "WhatsApp Konselor Piket" di modal SOS memakai
// `process.env.NEXT_PUBLIC_SOS_WA_NUMBER` langsung di komponen klien. Variabel
// itu tidak disetel di Vercel, sehingga tombolnya membuka
// https://wa.me/undefined — tombol paling penting di seluruh aplikasi, pada
// momen paling genting, membuka halaman error WhatsApp.
//
// Halaman /contact juga menampilkan placeholder "628xxxxxxxxxxxx" ke publik.
//
// Sumber kebenaran sekarang pengaturan situs (`sos_whatsapp_number`), yang
// sudah bisa diubah pengurus lewat panel. Env hanya cadangan.

// MASALAH KEDUA
// Setelah nomor diisi pengurus sebagai "0811 979 10000", tautannya menjadi
// https://wa.me/081197910000 — dan itu TETAP tidak berfungsi. wa.me mewajibkan
// kode negara; nomor berawalan 0 adalah format lokal Indonesia dan WhatsApp
// menganggapnya nomor yang tidak ada.
//
// Pengurus wajar mengetik nomor dalam format yang mereka pakai sehari-hari
// ("0811...", "+62 811...", "62811..."). Karena itu normalisasi mengubah
// awalan 0 menjadi 62, bukan hanya membuang karakter non-angka.

/** Kode negara Indonesia. */
const ID_CC = '62'

/**
 * Rapikan nomor jadi format yang diterima wa.me.
 *
 *   "0811 979 10000"   -> "6281197910000"
 *   "+62 811-9791-000" -> "628119791000"
 *   "6281197910000"    -> "6281197910000"
 *
 * Mengembalikan null bila nomornya tidak masuk akal, sehingga pemanggil bisa
 * MENYEMBUNYIKAN tombol alih-alih memasang tautan mati.
 */
export function normalizeWaNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/[^0-9]/g, '')
  if (!digits) return null

  // Awalan 0 -> kode negara. Hanya untuk nomor yang belum berawalan 62.
  if (digits.startsWith('0')) digits = ID_CC + digits.slice(1)
  // "620811..." (pengguna mengetik 0 setelah +62) juga diratakan.
  else if (digits.startsWith('620')) digits = ID_CC + digits.slice(3)

  // Nomor Indonesia: 62 + 8-13 digit. Nomor terlalu pendek hampir pasti salah
  // ketik, dan tautan yang salah lebih buruk daripada tidak ada tautan.
  if (!digits.startsWith(ID_CC)) return null
  if (digits.length < 10 || digits.length > 15) return null

  return digits
}

/** Tautan wa.me, atau null bila nomor belum diatur. */
export function waLink(raw: string | null | undefined, text?: string): string | null {
  const digits = normalizeWaNumber(raw)
  if (!digits) return null
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${q}`
}
