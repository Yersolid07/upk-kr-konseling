// src/lib/cms/action.ts
// Pembungkus Server Action untuk konsol CMS.
//
// MASALAH YANG DIPERBAIKI
// Aksi admin sebelumnya ditulis berulang-ulang dengan tangan: periksa peran,
// validasi, mutasi, tulis audit. Setiap penambahan fitur berarti satu peluang
// baru untuk LUPA salah satunya — dan yang paling sering terlupa adalah audit.
// Jejak audit yang tidak lengkap membuat konsol CMS yang bisa menghapus apa
// pun menjadi tidak dapat dipertanggungjawabkan.
//
// SATU TEMPAT, ENAM LANGKAH, URUTAN TETAP:
//   1. izin      — requireCap() dari lib/rbac.ts (bukan pemeriksaan peran manual)
//   2. validasi  — skema zod; pesan pertama dipakai sebagai pesan ke pengguna
//   3. snapshot  — kondisi SEBELUM, diambil lewat `load` (juga jadi pagar pengaman)
//   4. mutasi    — `run`
//   5. audit     — log_audit_v2 dengan before/after/alasan/IP/user-agent
//   6. segarkan  — revalidatePath untuk tiap jalur yang terpengaruh
//
// KLIEN PENGGUNA, BUKAN SERVICE ROLE
// Mutasi memakai klien milik pengguna yang login (createClient), bukan
// createAdminClient(). Dua alasan:
//   - auth.uid() terisi, sehingga log_audit_v2() bisa memverifikasi pemanggil
//     dan RLS tetap berlaku sebagai lapisan kedua;
//   - service_role melewati SELURUH RLS. Memakainya di jalur yang dipanggil
//     dari browser berarti satu bug guard langsung jadi akses penuh.
//
// KENAPA TIDAK ADA 'use server' DI BERKAS INI
// Berkas ber-'use server' hanya boleh mengekspor fungsi async — setiap ekspor
// menjadi endpoint yang bisa dipanggil dari browser. `cmsAction` adalah
// PABRIK (fungsi sinkron yang mengembalikan fungsi async), jadi ia tidak bisa
// tinggal di sana. Berkas ini modul server biasa; berkas aksi yang memakai
// 'use server' membungkus hasilnya dengan fungsi async eksplisit.
//
// `load` BUKAN SEKADAR SNAPSHOT
// Nilai kembaliannya dipakai untuk (a) mengisi `before` di audit dan (b)
// memberi `run` kesempatan menolak bila kondisinya tidak sesuai (mis. baris
// sudah dihapus, atau bukan milik organisasi). Bila `load` mengembalikan
// undefined, aksi dihentikan tanpa mutasi.

import { z } from 'zod'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireCap, type AuthContext } from '@/lib/auth-guard'
import { AuthorizationError, type Capability } from '@/lib/rbac'

/** Hasil seragam untuk seluruh aksi CMS. */
export type CmsResult<T> = { ok: true; data: T } | { ok: false; error: string }

type Db = ReturnType<typeof createClient>

/** Kata kerja yang dicatat di audit. Selaras dengan enum audit_action. */
export type CmsVerb =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'hide'
  | 'unhide'
  | 'purge'
  | 'bulk'
  | 'publish'
  | 'unpublish'
  | 'approve'
  | 'reject'
  | 'role_change'
  | 'settings_change'
  | 'export'
  | 'broadcast'
  | 'ban'
  | 'unban'
  | 'reveal_identity'

interface CmsActionOptions<S extends z.ZodTypeAny, T> {
  /** Kemampuan yang diperlukan — dicek terhadap lib/rbac.ts. */
  cap: Capability
  /** Nama tabel/entitas untuk audit, mis. 'threads'. */
  entity: string
  /** Kata kerja untuk audit. */
  action: CmsVerb
  /** Skema input. Terima FormData atau objek biasa. */
  schema: S
  /** Bila true, input wajib memuat `reason` yang tidak kosong. */
  requireReason?: boolean
  /**
   * Ambil kondisi sebelum mutasi. Kembalikan `undefined`/`null` untuk
   * menolak aksi (entitas tidak ada / tidak berhak).
   */
  load?: (input: z.infer<S>, db: Db) => Promise<unknown>
  /** Lakukan mutasi. Kembalikan id entitas dan (opsional) kondisi sesudah. */
  run: (
    ctx: AuthContext,
    input: z.infer<S>,
    db: Db,
    before: unknown
  ) => Promise<{ id: string | null; after?: unknown; data: T }>
  /** Jalur yang perlu disegarkan setelah mutasi. */
  revalidate?: string[]
}

/**
 * Ubah FormData jadi objek biasa supaya bisa divalidasi zod.
 * Checkbox HTML hanya mengirim nilainya saat dicentang, jadi `false` harus
 * diturunkan dari ketidakhadiran — bukan dari string "false" yang tidak ada.
 */
function normalizeInput(raw: unknown): unknown {
  if (typeof FormData === 'undefined' || !(raw instanceof FormData)) return raw

  const out: Record<string, unknown> = {}
  // Array.from, bukan `for...of raw.entries()` — target tsconfig tidak
  // mengaktifkan downlevelIteration, jadi iterator FormData tidak bisa
  // di-loop langsung.
  for (const [key, value] of Array.from(raw.entries())) {
    if (typeof value !== 'string') {
      out[key] = value
      continue
    }
    // Konvensi form CMS: checkbox memakai value "on" (perilaku bawaan HTML).
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2)
      out[k] = [...((out[k] as string[] | undefined) ?? []), value]
      continue
    }
    out[key] = value
  }
  return out
}

/** Cari field alasan apa pun namanya (`reason`, `note`, atau turunannya). */
function pickReason(input: unknown): string | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const raw = o.reason ?? o.note ?? o.delete_reason ?? o.hidden_reason
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

/**
 * Bungkus satu aksi CMS. Mengembalikan fungsi async yang menerima FormData
 * (dari <form action={...}>) atau objek biasa (dari pemanggilan program).
 */
export function cmsAction<S extends z.ZodTypeAny, T>(
  options: CmsActionOptions<S, T>
): (raw: unknown) => Promise<CmsResult<T>> {
  return async (raw: unknown): Promise<CmsResult<T>> => {
    try {
      // 1. IZIN — selalu langkah pertama, sebelum input disentuh.
      const ctx = await requireCap(options.cap)

      // 2. VALIDASI
      const input = options.schema.parse(normalizeInput(raw)) as z.infer<S>

      const reason = pickReason(input)
      if (options.requireReason && !reason) {
        return { ok: false, error: 'Alasan wajib diisi untuk tindakan ini.' }
      }

      const db = createClient()

      // 3. SNAPSHOT (sekaligus pagar pengaman)
      let before: unknown = null
      if (options.load) {
        before = await options.load(input, db)
        if (before === undefined || before === null) {
          return {
            ok: false,
            error: 'Data tidak ditemukan, atau kamu tidak berhak mengubahnya.',
          }
        }
      }

      // 4. MUTASI
      const result = await options.run(ctx, input, db, before)

      // 5. AUDIT — kegagalan mencatat audit TIDAK membatalkan mutasi yang
      // sudah terjadi, tetapi harus terlihat di log server.
      try {
        const h = headers()
        await db.rpc('log_audit_v2', {
          p_action: options.action,
          p_entity: options.entity,
          p_entity_id: result.id,
          p_before: (before ?? null) as never,
          p_after: (result.after ?? null) as never,
          p_reason: reason,
          p_ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
          p_ua: h.get('user-agent') ?? null,
        })
      } catch (auditErr) {
        console.error('[cmsAction] audit gagal dicatat', options.entity, options.action, auditErr)
      }

      // 6. SEGARKAN
      for (const path of options.revalidate ?? []) revalidatePath(path)

      return { ok: true, data: result.data }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return { ok: false, error: err.issues[0]?.message ?? 'Input tidak valid.' }
      }
      if (err instanceof AuthorizationError) {
        return { ok: false, error: err.message }
      }
      console.error('[cmsAction]', options.entity, options.action, err)
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan.'
      // Pesan dari RPC database (mis. dari RLS) diteruskan apa adanya —
      // ditulis dalam Bahasa Indonesia dan berguna bagi admin.
      return { ok: false, error: message }
    }
  }
}
