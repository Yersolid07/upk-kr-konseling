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

/** Rapikan nomor jadi digit saja (wa.me menolak +, spasi, dan tanda hubung). */
export function normalizeWaNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^0-9]/g, '')
  // Nomor Indonesia terpendek yang masuk akal: 62 + 8-11 digit.
  if (digits.length < 8) return null
  return digits
}

/** Tautan wa.me, atau null bila nomor belum diatur. */
export function waLink(raw: string | null | undefined, text?: string): string | null {
  const digits = normalizeWaNumber(raw)
  if (!digits) return null
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${q}`
}
