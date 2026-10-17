// src/lib/cms/content-tables.ts
// Daftar tabel konten yang dikelola CMS.
//
// File ini SENGAJA terpisah dari content-actions.ts: berkas ber-'use server'
// hanya boleh mengekspor fungsi async, jadi konstanta tidak boleh tinggal di
// sana. Dipisah juga supaya komponen klien bisa membaca label tanpa menarik
// seluruh modul server.

export const CONTENT_TABLES = {
  threads: { paths: ['/forum', '/admin/forum'], label: 'Diskusi' },
  comments: { paths: ['/forum', '/admin/forum'], label: 'Komentar' },
  prayer_requests: { paths: ['/prayer', '/admin/prayer'], label: 'Permohonan Doa' },
  articles: { paths: ['/renungan', '/admin/articles'], label: 'Artikel' },
  cell_groups: { paths: ['/cellgroup', '/admin/cellgroup'], label: 'KK & KTB' },
  cell_group_messages: {
    paths: ['/cellgroup', '/admin/cellgroup'],
    label: 'Pesan KK/KTB',
  },
} as const

export type ContentTable = keyof typeof CONTENT_TABLES

export const CONTENT_TABLE_NAMES = Object.keys(CONTENT_TABLES) as ContentTable[]

/** Label ramah untuk sebuah tabel konten. */
export function tableLabel(table: string): string {
  return (CONTENT_TABLES as Record<string, { label: string }>)[table]?.label ?? table
}
