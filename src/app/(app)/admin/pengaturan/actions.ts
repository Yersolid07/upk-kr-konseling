// src/app/(app)/admin/pengaturan/actions.ts
// Server Action untuk menyimpan pengaturan situs.
//
// Setiap perubahan pengaturan WAJIB lewat `cmsAction` — bukan karena
// birokrasi, tetapi karena pengaturan mengubah perilaku SELURUH situs
// (mis. menutup pendaftaran, menyalakan mode pemeliharaan). Tanpa audit,
// tidak akan ada cara mengetahui siapa yang mematikan forum.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { cmsAction } from '@/lib/cms/action'
import { SETTINGS_BY_KEY, type SettingKey } from '@/lib/settings/registry'

/** Satu perubahan pengaturan. */
const oneSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
})

/** Beberapa perubahan sekaligus (satu form berisi banyak field). */
const manySchema = z.object({
  values: z.record(z.string(), z.unknown()),
})

const saveSettingImpl = cmsAction({
  cap: 'manageSettings',
  entity: 'site_settings',
  action: 'settings_change',
  requireReason: false,
  schema: oneSchema,
  load: async ({ key }, db) => {
    const { data, error } = await db
      .from('site_settings')
      .select('key, value')
      .eq('key', key)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data ?? undefined
  },
  run: async (_ctx, { key, value }, db, before) => {
    const def = SETTINGS_BY_KEY[key as SettingKey]
    if (!def) throw new Error(`Pengaturan "${key}" tidak dikenal.`)

    // Validasi terhadap registry — bukan hanya tipe, tetapi juga batas nilai.
    const parsed = def.schema.safeParse(value)
    if (!parsed.success) {
      throw new Error(
        `Nilai tidak sah untuk "${def.label}": ${parsed.error.issues[0]?.message ?? 'tidak valid'}`
      )
    }

    const { error } = await db
      .from('site_settings')
      .upsert(
        { key, value: { value: parsed.data } as never, updated_at: new Date().toISOString() } as never,
        { onConflict: 'key' }
      )
    if (error) throw new Error(error.message)

    return {
      id: key,
      after: { value: parsed.data },
      data: { key, previous: (before as { value?: unknown } | null)?.value ?? null },
    }
  },
  revalidate: ['/admin/pengaturan'],
})

const saveSettingsImpl = cmsAction({
  cap: 'manageSettings',
  entity: 'site_settings',
  action: 'settings_change',
  requireReason: false,
  schema: manySchema,
  load: async ({ values }, db) => {
    const keys = Object.keys(values)
    const { data, error } = await db
      .from('site_settings')
      .select('key, value')
      .in('key', keys)
    if (error) throw new Error(error.message)
    // Simpan sebagai peta supaya audit memuat nilai SEBELUM untuk tiap kunci.
    const map: Record<string, unknown> = {}
    for (const row of (data ?? []) as unknown as { key: string; value: unknown }[]) {
      map[row.key] = row.value
    }
    return { before: map }
  },
  run: async (_ctx, { values }, db) => {
    const rows: { key: string; value: unknown; updated_at: string }[] = []
    const rejected: string[] = []

    for (const [key, raw] of Object.entries(values)) {
      const def = SETTINGS_BY_KEY[key as SettingKey]
      if (!def) {
        rejected.push(key)
        continue
      }
      const parsed = def.schema.safeParse(raw)
      if (!parsed.success) {
        throw new Error(
          `Nilai tidak sah untuk "${def.label}": ${parsed.error.issues[0]?.message ?? 'tidak valid'}`
        )
      }
      rows.push({ key, value: { value: parsed.data }, updated_at: new Date().toISOString() })
    }

    if (rejected.length > 0) {
      throw new Error(`Pengaturan tidak dikenal: ${rejected.join(', ')}`)
    }
    if (rows.length === 0) return { id: null, after: null, data: { count: 0 } }

    const { error } = await db
      .from('site_settings')
      .upsert(rows as never, { onConflict: 'key' })
    if (error) throw new Error(error.message)

    // Pengaturan dibaca lewat cache() bertag 'settings' — bersihkan supaya
    // perubahan langsung terlihat, bukan setelah cache kedaluwarsa.
    revalidatePath('/', 'layout')

    return { id: null, after: { count: rows.length, keys: rows.map((r) => r.key) }, data: { count: rows.length } }
  },
  revalidate: ['/admin/pengaturan'],
})

/** Pembungkus Server Action — lihat catatan di lib/cms/content-actions.ts. */
export async function saveSetting(input: unknown) {
  return saveSettingImpl(input)
}

export async function saveSettings(input: unknown) {
  return saveSettingsImpl(input)
}
