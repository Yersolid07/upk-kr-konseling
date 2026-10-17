// src/lib/cms/schema.ts
// Deteksi apakah migrasi Fase 2 (supabase/cms-superadmin.sql) sudah dijalankan.
//
// KENAPA PERLU
// Kode ini di-deploy SEBELUM admin sempat menempel SQL migrasi. Tanpa deteksi,
// halaman moderasi gagal dengan "column threads.moderation_status does not
// exist" — pesan PostgREST yang tidak berarti apa pun bagi pengguna.
//
// Pendekatannya: satu query ringan ke kolom yang hanya ada setelah migrasi.
// Hasilnya di-cache selama proses server hidup, jadi biayanya satu request
// per instance, bukan satu per halaman.

import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export interface SchemaState {
  /** Migrasi Fase 2 (cms-superadmin.sql) sudah dijalankan. */
  moderation: boolean
  /** Migrasi Fase 1 (phase1-data-security.sql) sudah dijalankan. */
  publicViews: boolean
}

/**
 * Periksa keberadaan kolom/tabel hasil migrasi.
 * `cache()` React membuat hasil ini dipakai ulang dalam satu render.
 */
export const checkSchema = cache(async (): Promise<SchemaState> => {
  const supabase = createClient()

  const [mod, views] = await Promise.all([
    supabase.from('threads').select('id, moderation_status').limit(1),
    supabase.from('threads_public').select('id, anon_label').limit(1),
  ])

  return {
    // Kode error 42703 = kolom tidak ada; PGRST205 = tabel tidak ada.
    moderation: !mod.error,
    publicViews: !views.error,
  }
})

/**
 * Pesan yang ditampilkan saat migrasi belum dijalankan.
 * Ditulis sebagai instruksi konkret, bukan sekadar "terjadi kesalahan".
 */
export function migrationNotice(missing: keyof SchemaState): string {
  const file =
    missing === 'moderation'
      ? 'supabase/cms-superadmin.sql'
      : 'supabase/phase1-data-security.sql'
  return `Migrasi ${file} belum dijalankan di Supabase. Buka Supabase → SQL Editor, tempel isi berkas itu, lalu Run. Urutan lengkap ada di JALANKAN-MIGRASI.md.`
}
